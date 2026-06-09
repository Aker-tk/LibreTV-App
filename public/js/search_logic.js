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
async function search() {
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      if (typeof showPasswordModal === "function") showPasswordModal();
      else console.error("showPasswordModal not defined");
      return;
    }
  }
  const query = document.getElementById("searchInput").value.trim();
  if (!query) {
    if (typeof showToast === "function") showToast("请输入搜索内容", "info");
    else console.warn("showToast not defined");
    return;
  }
  if (selectedAPIs.length === 0) {
    if (typeof showToast === "function") showToast("请至少选择一个API源", "warning");
    else console.warn("showToast not defined");
    return;
  }
  if (typeof showLoading === "function") showLoading();
  else console.log("Loading...");
  try {
    if (typeof saveSearchHistory === "function") saveSearchHistory(query);
    else console.warn("saveSearchHistory not defined");
    sessionStorage.setItem("lastSearchQuery", query);
    sessionStorage.setItem("lastPageView", "searchResults");
    let allResults = [];
    const searchPromises = selectedAPIs.map(async (apiId) => {
      let apiUrl = "";
      try {
        const resultsAreaEl2 = document.getElementById("resultsArea");
        if (resultsAreaEl2) resultsAreaEl2.classList.remove("hidden");
        let apiName, apiBaseUrl;
        if (apiId.startsWith("custom_")) {
          const customIndex = apiId.replace("custom_", "");
          const customApi = typeof getCustomApiInfo === "function" ? getCustomApiInfo(customIndex) : null;
          if (!customApi) return [];
          apiBaseUrl = customApi.url;
          apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
          apiName = customApi.name;
        } else {
          if (!API_SITES[apiId]) return [];
          apiBaseUrl = API_SITES[apiId].api;
          apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
          apiName = API_SITES[apiId].name;
        }
        if (!tauriConstants || !tauriConstants.invoke) {
          console.error("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Tauri invoke function is not available."));
          return [];
        }
        const rustRequestOptions = {
          url: apiUrl,
          method: "GET",
          headers: API_CONFIG.search.headers,
          timeout_secs: Math.floor(AGGREGATED_SEARCH_CONFIG.timeout / 1e3) || 8
        };
        console.log("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Invoking make_http_request for main search:"), JSON.stringify(rustRequestOptions));
        const rustResponse = await tauriConstants.invoke("make_http_request", { options: rustRequestOptions });
        console.log("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Response from Rust. Status: ").concat(rustResponse.status, ". Body preview: ").concat((rustResponse.body || "").substring(0, 100)));
        if (!(rustResponse.status >= 200 && rustResponse.status < 300)) {
          console.error("API ".concat(apiId, " (").concat(apiUrl, ") 请求失败 (via Rust)，状态码: ").concat(rustResponse.status, ", Body: ").concat(rustResponse.body));
          return [];
        }
        let data;
        try {
          data = JSON.parse(rustResponse.body);
        } catch (parseError) {
          console.error("API ".concat(apiId, " (").concat(apiUrl, ") 无法解析JSON (via Rust): ").concat(parseError.message, ". Body: ").concat(rustResponse.body));
          if (rustResponse.body && rustResponse.body.toLowerCase().includes("<html")) {
            console.warn("API ".concat(apiId, " (").concat(apiUrl, ") via Rust returned HTML. This might indicate an issue with the API or a block page."));
          }
          return [];
        }
        if (!data || !data.list || !Array.isArray(data.list)) {
          console.warn("API ".concat(apiId, " (").concat(apiUrl, ") 返回的数据格式不符合预期 (缺少 list 数组):"), data);
          return [];
        }
        const results = data.list.map((item) => {
          var _a;
          return __spreadProps(__spreadValues({}, item), {
            source_name: apiName,
            source_code: apiId,
            api_url: apiId.startsWith("custom_") ? typeof getCustomApiInfo === "function" ? (_a = getCustomApiInfo(apiId.replace("custom_", ""))) == null ? void 0 : _a.url : void 0 : void 0
          });
        });
        const pageCount = data.pagecount || 1;
        const pagesToFetch = Math.min(pageCount - 1, API_CONFIG.search.maxPages - 1);
        if (pagesToFetch > 0) {
          const additionalPagePromises = [];
          for (let page = 2; page <= pagesToFetch + 1; page++) {
            const pageUrl = apiBaseUrl + API_CONFIG.search.pagePath.replace("{query}", encodeURIComponent(query)).replace("{page}", page);
            const pagePromise = (async () => {
              try {
                if (!tauriConstants || !tauriConstants.invoke) {
                  console.error("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Page ").concat(page, " Tauri invoke function is not available."));
                  return [];
                }
                const pageRequestOptions = {
                  url: pageUrl,
                  method: "GET",
                  headers: API_CONFIG.search.headers,
                  timeout_secs: Math.floor(AGGREGATED_SEARCH_CONFIG.timeout / 1e3) || 8
                };
                console.log("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Invoking make_http_request for page ").concat(page, ":"), JSON.stringify(pageRequestOptions));
                const pageRustResponse = await tauriConstants.invoke("make_http_request", { options: pageRequestOptions });
                console.log("[MY_APP_DEBUG_APP_SEARCH] API ".concat(apiId, " Page ").concat(page, " Response from Rust. Status: ").concat(pageRustResponse.status, ". Body preview: ").concat((pageRustResponse.body || "").substring(0, 100)));
                if (!(pageRustResponse.status >= 200 && pageRustResponse.status < 300)) {
                  console.error("API ".concat(apiId, " (").concat(pageUrl, ") 分页请求失败 (via Rust)，状态码: ").concat(pageRustResponse.status, ", Body: ").concat(pageRustResponse.body));
                  return [];
                }
                let pageData;
                try {
                  pageData = JSON.parse(pageRustResponse.body);
                } catch (parseError) {
                  console.error("API ".concat(apiId, " (").concat(pageUrl, ") 分页无法解析JSON (via Rust): ").concat(parseError.message, ". Body: ").concat(pageRustResponse.body));
                  return [];
                }
                if (!pageData || !pageData.list || !Array.isArray(pageData.list)) {
                  console.warn("API ".concat(apiId, " (").concat(pageUrl, ") 分页返回的数据格式不符合预期 (缺少 list 数组):"), pageData);
                  return [];
                }
                return pageData.list.map((item) => {
                  var _a;
                  return __spreadProps(__spreadValues({}, item), {
                    source_name: apiName,
                    source_code: apiId,
                    api_url: apiId.startsWith("custom_") ? typeof getCustomApiInfo === "function" ? (_a = getCustomApiInfo(apiId.replace("custom_", ""))) == null ? void 0 : _a.url : void 0 : void 0
                  });
                });
              } catch (error) {
                console.warn("API ".concat(apiId, " 第").concat(page, "页 (").concat(pageUrl, ") 搜索失败:"), error.message);
                return [];
              }
            })();
            additionalPagePromises.push(pagePromise);
          }
          const additionalResults = await Promise.all(additionalPagePromises);
          additionalResults.forEach((pageResults) => {
            if (pageResults.length > 0) {
              Array.prototype.push.apply(results, pageResults);
            }
          });
        }
        return results;
      } catch (error) {
        console.warn("API ".concat(apiId, " (").concat(apiUrl || "URL未定义", ") 搜索最外层捕获失败:"), error.message);
        return [];
      }
    });
    const resultsArray = await Promise.all(searchPromises);
    resultsArray.forEach((results) => {
      if (Array.isArray(results) && results.length > 0) {
        allResults = allResults.concat(results);
      }
    });
    const searchResultsCount = document.getElementById("searchResultsCount");
    if (searchResultsCount) {
      searchResultsCount.textContent = allResults.length;
    }
    const resultsAreaEl = document.getElementById("resultsArea");
    if (resultsAreaEl) resultsAreaEl.classList.remove("hidden");
    const resultsDiv = document.getElementById("results");
    if (!allResults || allResults.length === 0) {
      resultsDiv.innerHTML = '\n                <div class="col-span-full text-center py-16">\n                    <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" \n                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />\n                    </svg>\n                    <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>\n                    <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>\n                </div>\n            ';
      if (typeof hideLoading === "function") hideLoading();
      else console.log("Loading complete.");
      return;
    }
    const yellowFilterEnabled = localStorage.getItem("yellowFilterEnabled") === "true";
    if (yellowFilterEnabled) {
      const banned = ["伦理片", "福利", "里番动漫", "门事件", "萝莉少女", "制服诱惑", "国产传媒", "cosplay", "黑丝诱惑", "无码", "日本无码", "有码", "日本有码", "SWAG", "网红主播", "色情片", "同性片", "福利视频", "福利片"];
      allResults = allResults.filter((item) => {
        const typeName = item.type_name || "";
        return !banned.some((keyword) => typeName.includes(keyword));
      });
    }
    const safeResults = allResults.map((item) => {
      const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, "") : "";
      const safeName = (item.vod_name || "").toString().replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
      const sourceInfo = item.source_name ? '<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">'.concat(item.source_name.replace(/</g, "<").replace(/>/g, ">"), "</span>") : "";
      const sourceCode = item.source_code || "";
      const apiUrlAttr = item.api_url ? 'data-api-url="'.concat(item.api_url.replace(/"/g, '"'), '"') : "";
      const hasCover = item.vod_pic && item.vod_pic.startsWith("http");
      return "\n                <div class=\"card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md\" \n                     onclick=\"if(typeof showDetails === 'function') showDetails('".concat(safeId, "','").concat(safeName, "','").concat(sourceCode, "'); else console.error('showDetails not defined')\" ").concat(apiUrlAttr, '>\n                    <div class="flex h-full">\n                        ').concat(hasCover ? '\n                        <div class="relative flex-shrink-0 search-card-img-container">\n                            <img src="'.concat(item.vod_pic, '" alt="').concat(safeName, '" \n                                 class="h-full w-full object-cover transition-transform hover:scale-110" \n                                 onerror="this.onerror=null; this.src=\'https://via.placeholder.com/300x450?text=无封面\'; this.classList.add(\'object-contain\');" \n                                 loading="lazy">\n                            <div class="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>\n                        </div>') : "", '\n                        \n                        <div class="p-2 flex flex-col flex-grow">\n                            <div class="flex-grow">\n                                <h3 class="font-semibold mb-2 break-words line-clamp-2 ').concat(hasCover ? "" : "text-center", '" title="').concat(safeName, '">').concat(safeName, '</h3>\n                                \n                                <div class="flex flex-wrap ').concat(hasCover ? "" : "justify-center", ' gap-1 mb-2">\n                                    ').concat((item.type_name || "").toString().replace(/</g, "<") ? '<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">\n                                          '.concat((item.type_name || "").toString().replace(/</g, "<"), "\n                                      </span>") : "", "\n                                    ").concat(item.vod_year || "" ? '<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">\n                                          '.concat(item.vod_year, "\n                                      </span>") : "", '\n                                </div>\n                                <p class="text-gray-400 line-clamp-2 overflow-hidden ').concat(hasCover ? "" : "text-center", ' mb-2">\n                                    ').concat((item.vod_remarks || "暂无介绍").toString().replace(/</g, "<"), '\n                                </p>\n                            </div>\n                            \n                            <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800">\n                                ').concat(sourceInfo ? "<div>".concat(sourceInfo, "</div>") : "<div></div>", "\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            ");
    }).join("");
    resultsDiv.innerHTML = safeResults;
  } catch (error) {
    console.error("搜索错误:", error);
    if (error.name === "AbortError") {
      if (typeof showToast === "function") showToast("搜索请求超时，请检查网络连接", "error");
      else console.error("Search timed out");
    } else {
      if (typeof showToast === "function") showToast("搜索请求失败，请稍后重试", "error");
      else console.error("Search failed");
    }
  } finally {
    if (typeof hideLoading === "function") hideLoading();
    else console.log("Loading complete.");
  }
}
