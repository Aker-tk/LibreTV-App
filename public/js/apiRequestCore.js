var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
async function executeApiRequest(apiUrl, options = {}) {
  console.log("[JS] executeApiRequest called with apiUrl: ".concat(apiUrl, ", options:"), JSON.stringify(options));
  const {
    method = "GET",
    headers = {},
    timeoutSecs = tauriConstants.TIMEOUT_SECS,
    // Assumes tauriConstants is globally available
    sourceForLog = "",
    asText = false
    // New option to expect text response
  } = options;
  const logPrefix = sourceForLog ? "(".concat(sourceForLog, ") ") : "";
  let responseData;
  const isTauriNow = isLikelyTauriEnvironment();
  if (isTauriNow && tauriConstants.invoke) {
    const rustOptions = {
      url: apiUrl,
      method,
      headers,
      timeout_secs: timeoutSecs,
      response_as_text: asText
      // Pass asText to Rust options
    };
    try {
      const rustResponse = await tauriConstants.invoke("make_http_request", { options: rustOptions });
      if (rustResponse.status >= 200 && rustResponse.status < 300) {
        if (asText) {
          responseData = rustResponse.body;
        } else {
          const contentType = rustResponse.headers["content-type"] || rustResponse.headers["Content-Type"] || "";
          if (contentType.includes("application/json")) {
            responseData = JSON.parse(rustResponse.body);
          } else {
            throw createApiError("".concat(logPrefix, "API (via invoke) returned non-JSON content-type: '").concat(contentType, "' when JSON was expected. Body: ").concat(rustResponse.body.substring(0, 200)));
          }
        }
      } else {
        throw createApiError("".concat(logPrefix, "API (via invoke) returned error status ").concat(rustResponse.status, ". Body: ").concat(rustResponse.body.substring(0, 200)), rustResponse.status);
      }
    } catch (invokeError) {
      console.error("Tauri invoke 'make_http_request' failed for ".concat(logPrefix, "request:"), invokeError);
      let errMsg = "Tauri IPC call failed for ".concat(logPrefix, "request");
      if (typeof invokeError === "string") errMsg = invokeError;
      else if (invokeError && typeof invokeError === "object" && invokeError.error) errMsg = "".concat(invokeError.error).concat(invokeError.details ? ": " + invokeError.details : "");
      else if (invokeError && invokeError.message) errMsg = invokeError.message;
      const customErr = createApiError(errMsg);
      if (invokeError && typeof invokeError === "object" && invokeError.status) customErr.statusCode = invokeError.status;
      throw customErr;
    }
  } else {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), timeoutSecs * 1e3);
    let fetchUrlToUse = apiUrl;
    let effectiveHeaders = __spreadValues({}, headers);
    try {
      const response = await fetch(fetchUrlToUse, { headers: effectiveHeaders, signal: controller.signal, method });
      clearTimeout(timeoutId);
      timeoutId = null;
      const responseText = await response.text();
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errMsg = "".concat(logPrefix, "代理服务错误: ").concat(response.status, ". URL: ").concat(fetchUrlToUse, ". Response: ").concat(responseText.substring(0, 200));
        try {
          const eData = JSON.parse(responseText);
          if (eData) errMsg += eData.error ? " - ".concat(eData.error) : eData.msg ? " - ".concat(eData.msg) : "";
        } catch (e) {
        }
        console.error("[executeApiRequest] Fetch error: Status ".concat(response.status, ", URL: ").concat(fetchUrlToUse, ", Headers:"), response.headers, "Body chunk: ".concat(responseText.substring(0, 500)));
        throw createApiError(errMsg, response.status);
      }
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        const errorDetails = "".concat(logPrefix, "内容解析失败. Content-Type: ").concat(contentType, ". URL: ").concat(fetchUrlToUse, ". Error: ").concat(parseError.message, ". Body chunk: ").concat(responseText.substring(0, 500));
        console.error("[executeApiRequest] JSON Parse error:", errorDetails);
        if (!contentType || !contentType.includes("application/json")) {
          throw createApiError("".concat(logPrefix, "API返回的不是有效的JSON格式，且内容解析失败。接收到 Content-Type: ").concat(contentType, ". 内容: ").concat(responseText.substring(0, 100), "..."));
        }
        throw createApiError("".concat(logPrefix, "API返回了application/json类型，但JSON内容无效。错误: ").concat(parseError.message, ". 内容: ").concat(responseText.substring(0, 100), "..."));
      }
      if (contentType && !contentType.includes("application/json")) {
        console.warn("[executeApiRequest] ".concat(logPrefix, "Response parsed as JSON, but Content-Type was '").concat(contentType, "'. URL: ").concat(fetchUrlToUse));
      }
    } catch (fetchCatchError) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("[executeApiRequest] Catch all fetch error for ".concat(logPrefix, "request to ").concat(fetchUrlToUse, ":"), fetchCatchError, "Original URL: ".concat(apiUrl));
      throw fetchCatchError;
    }
  }
  return responseData;
}
