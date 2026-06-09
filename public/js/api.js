async function handleApiRequest(url) {
  const customApi = url.searchParams.get("customApi") || "";
  const customDetail = url.searchParams.get("customDetail") || "";
  const source = url.searchParams.get("source") || "heimuer";
  try {
    if (url.pathname === "/api/search") {
      const searchQuery = url.searchParams.get("wd");
      if (!searchQuery) throw createApiError("缺少搜索参数");
      const searchResult = await handleSingleSourceSearch(searchQuery, source, customApi);
      return JSON.stringify(searchResult);
    }
    if (url.pathname === "/api/detail") {
      const id = url.searchParams.get("id");
      const sourceCode = url.searchParams.get("source") || "heimuer";
      if (!id) throw createApiError("缺少视频ID参数");
      if (!/^[\w-]+$/.test(id)) throw createApiError("无效的视频ID格式");
      if (sourceCode === "custom" && !customApi && !customDetail) {
        throw createApiError("自定义API模式下缺少API地址或详情页地址");
      }
      if (!API_SITES[sourceCode] && sourceCode !== "custom") throw createApiError("无效的API来源");
      let detailResult;
      if (sourceCode !== "custom" && API_SITES[sourceCode] && API_SITES[sourceCode].detail) {
        detailResult = await handleSpecialSourceDetail(id, sourceCode);
      } else if (sourceCode === "custom" && customDetail) {
        detailResult = await handleCustomApiSpecialDetail(id, customDetail);
      } else if (sourceCode === "custom" && url.searchParams.get("useDetail") === "true" && customApi) {
        detailResult = await handleCustomApiSpecialDetail(id, customApi);
      } else {
        detailResult = await handleStandardDetailFetch(id, sourceCode, customApi);
      }
      return JSON.stringify(detailResult);
    }
    throw createApiError("未知的API路径");
  } catch (error) {
    console.error("API路由处理错误:", error);
    const responseCode = typeof error.statusCode === "number" ? error.statusCode : 400;
    return JSON.stringify({ code: responseCode, msg: error.message || "请求处理失败", list: [], episodes: [] });
  }
}
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const requestUrl = typeof input === "string" ? new URL(input, window.location.origin) : input.url;
    if (requestUrl.pathname.startsWith("/api/")) {
      if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
          console.warn("API request blocked due to unverified password.");
          return new Response(JSON.stringify({ code: 401, msg: "Password not verified" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
      }
      try {
        const sourceParam = requestUrl.searchParams.get("source");
        const wdParam = requestUrl.searchParams.get("wd");
        const customApiUrlsParam = requestUrl.searchParams.get("customApiUrls");
        if (requestUrl.pathname === "/api/search" && sourceParam === "aggregated" && wdParam) {
          const data = await handleAggregatedSearch(wdParam);
          return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        } else if (requestUrl.pathname === "/api/search" && sourceParam === "custom" && customApiUrlsParam && wdParam) {
          const data = await handleMultipleCustomSearch(wdParam, customApiUrlsParam);
          return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        const dataString = await handleApiRequest(requestUrl);
        return new Response(dataString, {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (error) {
        console.error("Fetch Interception Error (main interceptor level):", error);
        const statusCode = error.statusCode || 500;
        return new Response(JSON.stringify({
          code: statusCode,
          msg: "服务器内部错误 (拦截器): ".concat(error.message || "未知拦截器错误"),
          list: [],
          episodes: []
        }), { status: statusCode, headers: { "Content-Type": "application/json" } });
      }
    }
    return originalFetch.apply(this, arguments);
  };
})();
async function testSiteAvailability(apiUrl) {
  try {
    const response = await fetch("/api/search?wd=test&customApi=".concat(encodeURIComponent(apiUrl), "&source=custom"));
    const responseText = await response.text();
    const data = JSON.parse(responseText);
    return data && data.code === 200 && Array.isArray(data.list);
  } catch (error) {
    console.error("站点可用性测试失败:", error);
    return false;
  }
}
