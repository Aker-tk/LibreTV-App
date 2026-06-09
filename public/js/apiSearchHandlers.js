var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
async function handleSingleSourceSearch(searchQuery, source, customApi) {
  var _a;
  if (!searchQuery) throw createApiError("缺少搜索参数");
  if (!searchQuery) throw createApiError("缺少搜索参数");
  if (source === "custom" && !customApi) throw createApiError("使用自定义API时必须提供API地址");
  let responseDataJsonString;
  try {
    const tauriCore = window.__TAURI__.core;
    responseDataJsonString = await tauriCore.invoke("search_videos", {
      query: searchQuery,
      sourceId: source,
      customApiUrl: customApi
    });
  } catch (error) {
    console.error("Tauri invoke 'search_videos' for source '".concat(source, "' failed:"), error);
    let errorMessage = "搜索源 '".concat(source, "' 失败");
    if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object" && error.error) {
      errorMessage = "".concat(error.error).concat(error.details ? ": " + error.details : "");
    } else if (error && error.message) {
      errorMessage = error.message;
    }
    throw createApiError(errorMessage, (error == null ? void 0 : error.status) || 500);
  }
  let responseData;
  try {
    responseData = JSON.parse(responseDataJsonString);
  } catch (e) {
    console.error("Failed to parse JSON response from 'search_videos' for source '".concat(source, "':"), responseDataJsonString);
    throw createApiError("源 '".concat(source, "' 返回的JSON数据无效"), 500);
  }
  if (responseData.code && responseData.code !== 200 && responseData.code !== 0 && responseData.code !== 1) {
    throw createApiError(responseData.msg || "API返回错误代码: ".concat(responseData.code), responseData.code);
  }
  if (!responseData || typeof responseData.list === "undefined") {
    if (responseData.code !== 1) {
      throw createApiError("API返回的数据格式无效: 缺少 list 字段", responseData.code || 500);
    }
    responseData.list = [];
  }
  if (!Array.isArray(responseData.list)) {
    if (responseData.code === 1 && responseData.list === null) {
      responseData.list = [];
    } else {
      throw createApiError("API返回的数据格式无效: list 字段不是数组", responseData.code || 500);
    }
  }
  const sourceNameDisplay = source === "custom" ? customApi ? "自定义 (".concat(new URL(customApi).hostname, ")") : "自定义源" : ((_a = API_SITES[source]) == null ? void 0 : _a.name) || source;
  responseData.list.forEach((item) => {
    item.source_name = sourceNameDisplay;
    item.source_code = source;
    if (source === "custom" && customApi) item.api_url = customApi;
  });
  return { code: 200, list: responseData.list || [] };
}
async function handleAggregatedSearch(searchQuery) {
  const availableSources = Object.keys(API_SITES).filter((key) => key !== "aggregated" && key !== "custom");
  if (availableSources.length === 0) throw createApiError("没有可用的API源");
  const searchPromises = availableSources.map(async (source) => {
    const apiUrl = "".concat(API_SITES[source].api).concat(API_CONFIG.search.path).concat(encodeURIComponent(searchQuery));
    try {
      let sourceData = await executeApiRequest(apiUrl, {
        headers: API_CONFIG.search.headers || {},
        timeoutSecs: 8,
        // Shorter timeout for aggregated
        sourceForLog: "aggregated-".concat(source)
      });
      if (!sourceData || !Array.isArray(sourceData.list)) throw createApiError("".concat(source, "源返回的数据格式无效"));
      return sourceData.list.map((item) => __spreadProps(__spreadValues({}, item), { source_name: API_SITES[source].name, source_code: source }));
    } catch (error) {
      console.warn("".concat(source, "源搜索失败:"), error.message);
      const statusCode = error.statusCode || (error.message && error.message.includes("超时") ? 408 : void 0);
      return { error: true, source_name: API_SITES[source] ? API_SITES[source].name : source, source_code: source, message: error.message, statusCode };
    }
  });
  try {
    const resultsArray = await Promise.all(searchPromises);
    let allResults = [], sourceErrors = [];
    resultsArray.forEach((result) => {
      if (result.error) sourceErrors.push(result);
      else if (Array.isArray(result)) allResults = allResults.concat(result);
    });
    if (allResults.length === 0 && sourceErrors.length > 0 && sourceErrors.length === availableSources.length) {
      const errMsgs = sourceErrors.map((err) => "".concat(err.source_name, ": ").concat(err.message)).join("; ");
      throw createApiError("所有聚合搜索源均失败: ".concat(errMsgs), 503);
    }
    if (allResults.length === 0 && sourceErrors.length < availableSources.length) {
      return { code: 200, list: [], msg: "所有成功响应的源均无搜索结果。部分源可能已失败。", source_errors: sourceErrors.length > 0 ? sourceErrors : void 0 };
    }
    const uniqueResults = [];
    const seen = /* @__PURE__ */ new Set();
    allResults.forEach((item) => {
      const k = "".concat(item.source_code, "_").concat(item.vod_id);
      if (!seen.has(k)) {
        seen.add(k);
        uniqueResults.push(item);
      }
    });
    uniqueResults.sort((a, b) => (a.vod_name || "").localeCompare(b.vod_name || "") || (a.source_name || "").localeCompare(b.source_name || ""));
    return { code: 200, list: uniqueResults, source_errors: sourceErrors.length > 0 ? sourceErrors : void 0 };
  } catch (error) {
    console.error("聚合搜索处理错误:", error);
    throw createApiError("聚合搜索处理错误: ".concat(error.message || "未知错误"), error.statusCode || 500);
  }
}
async function handleMultipleCustomSearch(searchQuery, customApiUrls) {
  const apiUrls = customApiUrls.split(CUSTOM_API_CONFIG.separator).map((url) => url.trim()).filter((url) => url.length > 0 && /^https?:\/\//.test(url)).slice(0, CUSTOM_API_CONFIG.maxSources);
  if (apiUrls.length === 0) throw createApiError("没有提供有效的自定义API地址");
  const searchPromises = apiUrls.map(async (apiUrl, index) => {
    const sourceName = "".concat(CUSTOM_API_CONFIG.namePrefix).concat(index + 1);
    try {
      const fullUrl = "".concat(apiUrl).concat(API_CONFIG.search.path).concat(encodeURIComponent(searchQuery));
      let sourceData = await executeApiRequest(fullUrl, {
        headers: API_CONFIG.search.headers || {},
        timeoutSecs: 8,
        // Shorter timeout
        sourceForLog: "custom-aggregated-".concat(sourceName)
      });
      if (!sourceData || !Array.isArray(sourceData.list)) throw createApiError("自定义API ".concat(sourceName, " 返回的数据格式无效"));
      return sourceData.list.map((item) => __spreadProps(__spreadValues({}, item), { source_name: sourceName, source_code: "custom", api_url: apiUrl }));
    } catch (error) {
      console.warn("自定义API ".concat(sourceName, " (").concat(apiUrl, ") 搜索失败:"), error.message);
      const statusCode = error.statusCode || (error.message && error.message.includes("超时") ? 408 : void 0);
      return { error: true, source_name: sourceName, api_url: apiUrl, message: error.message, statusCode };
    }
  });
  try {
    const resultsArray = await Promise.all(searchPromises);
    let allResults = [], sourceErrors = [];
    resultsArray.forEach((result) => {
      if (result.error) sourceErrors.push(result);
      else if (Array.isArray(result)) allResults = allResults.concat(result);
    });
    if (allResults.length === 0 && sourceErrors.length > 0 && sourceErrors.length === apiUrls.length) {
      const errMsgs = sourceErrors.map((err) => "".concat(err.source_name, ": ").concat(err.message)).join("; ");
      throw createApiError("所有自定义API聚合搜索源均失败: ".concat(errMsgs), 503);
    }
    const uniqueResults = [];
    const seen = /* @__PURE__ */ new Set();
    allResults.forEach((item) => {
      const k = "".concat(item.api_url || "", "_").concat(item.vod_id);
      if (!seen.has(k)) {
        seen.add(k);
        uniqueResults.push(item);
      }
    });
    return { code: 200, list: uniqueResults, source_errors: sourceErrors.length > 0 ? sourceErrors : void 0 };
  } catch (error) {
    console.error("自定义API聚合搜索处理错误:", error);
    throw createApiError("自定义API聚合搜索处理错误: ".concat(error.message || "未知错误"), error.statusCode || 500);
  }
}
