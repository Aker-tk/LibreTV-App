async function showDetails(id, vod_name, sourceCode) {
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      if (typeof showPasswordModal === "function") showPasswordModal();
      else console.error("showPasswordModal not defined");
      return;
    }
  }
  if (!id) {
    if (typeof showToast === "function") showToast("视频ID无效", "error");
    else console.warn("showToast not defined");
    return;
  }
  if (typeof showLoading === "function") showLoading();
  else console.log("Loading details...");
  try {
    let apiParams = "";
    if (!tauriConstants || !tauriConstants.invoke) {
      console.error("[MY_APP_DEBUG_APP_DETAIL] Tauri invoke function is not available.");
      throw new Error("Tauri API (invoke) not available for detail request.");
    }
    let detailApiUrl;
    if (sourceCode.startsWith("custom_")) {
      const customIndex = sourceCode.replace("custom_", "");
      const customApi = typeof getCustomApiInfo === "function" ? getCustomApiInfo(customIndex) : null;
      if (!customApi) throw new Error("Custom API not found for detail request");
      const baseDetailUrl = customApi.detail || customApi.url;
      detailApiUrl = baseDetailUrl + API_CONFIG.detail.path + encodeURIComponent(id);
    } else {
      const apiSite = API_SITES[sourceCode];
      if (!apiSite) throw new Error("API site config not found for detail request");
      const baseDetailUrl = apiSite.detail || apiSite.api;
      detailApiUrl = baseDetailUrl + API_CONFIG.detail.path + encodeURIComponent(id);
    }
    const requestOptions = {
      url: detailApiUrl,
      method: "GET",
      headers: API_CONFIG.detail.headers,
      timeout_secs: 15
    };
    console.log("[MY_APP_DEBUG_APP_DETAIL] Invoking make_http_request for details:", JSON.stringify(requestOptions));
    const rustResponse = await tauriConstants.invoke("make_http_request", { options: requestOptions });
    console.log("[MY_APP_DEBUG_APP_DETAIL] Detail Response from Rust. Status: ".concat(rustResponse.status, ". Body preview: ").concat((rustResponse.body || "").substring(0, 100)));
    if (!(rustResponse.status >= 200 && rustResponse.status < 300)) {
      throw new Error("Failed to fetch details (via Rust). Status: ".concat(rustResponse.status, ", Body: ").concat(rustResponse.body));
    }
    const data = JSON.parse(rustResponse.body);
    const modal = document.getElementById("modal");
    const modalTitleEl = document.getElementById("modalTitle");
    const modalContent = document.getElementById("modalContent");
    const videoData = data.list && data.list.length > 0 ? data.list[0] : null;
    let sourceNameDisplay = "";
    if (videoData && videoData.source_name) {
      sourceNameDisplay = videoData.source_name;
    } else if (sourceCode) {
      if (sourceCode.startsWith("custom_")) {
        const customIndex = sourceCode.replace("custom_", "");
        const customApi = typeof getCustomApiInfo === "function" ? getCustomApiInfo(customIndex) : null;
        if (customApi) sourceNameDisplay = customApi.name;
      } else if (API_SITES[sourceCode]) {
        sourceNameDisplay = API_SITES[sourceCode].name;
      }
    }
    const sourceNameSpan = sourceNameDisplay ? ' <span class="text-sm font-normal text-gray-400">('.concat((sourceNameDisplay || "").replace(/</g, "<").replace(/>/g, ">"), ")</span>") : "";
    const safeVodName = (vod_name || (videoData ? videoData.vod_name : "未知视频")).replace(/</g, "<").replace(/>/g, ">");
    modalTitleEl.innerHTML = '<span class="break-words">'.concat(safeVodName, "</span>").concat(sourceNameSpan);
    currentVideoTitle = vod_name || (videoData ? videoData.vod_name : "未知视频");
    let episodesRaw = videoData ? videoData.vod_play_url : null;
    let parsedEpisodes = [];
    if (episodesRaw && typeof episodesRaw === "string") {
      const firstSourceGroup = episodesRaw.split("$$$")[0];
      if (firstSourceGroup) {
        parsedEpisodes = firstSourceGroup.split("#").map((singleEpisodeStr) => {
          const parts = singleEpisodeStr.split("$");
          if (parts.length > 1 && parts[1] && (parts[1].startsWith("http://") || parts[1].startsWith("https://") || parts[1].includes(".m3u8"))) {
            return { name: parts[0], url: parts[1].replace(/"/g, '"') };
          }
          return null;
        }).filter((ep) => ep && ep.url);
      }
      console.log("[AppDebug] episodesRaw (full):", episodesRaw.substring(0, 200) + "...");
      console.log("[AppDebug] firstSourceGroup used:", firstSourceGroup ? firstSourceGroup.substring(0, 200) + "..." : "N/A");
      console.log("[AppDebug] parsedEpisodes.length:", parsedEpisodes.length);
    }
    if (parsedEpisodes.length > 0) {
      currentEpisodes = parsedEpisodes.map((ep) => ep.url);
      episodesReversed = false;
      modalContent.innerHTML = '\n                <div class="flex justify-end mb-2">\n                    <button onclick="toggleEpisodeOrder(\''.concat(sourceCode, '\')" class="px-4 py-1 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors flex items-center space-x-1">\n                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">\n                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />\n                        </svg>\n                        <span>倒序排列</span>\n                    </button>\n                    <button title="批量复制播放链接" onclick="copyLinks()" class="ml-2 px-2 py-1 bg-[#222] hover:bg-[#333] border border-[#333] text-white rounded-lg transition">\n                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />\n                        </svg>\n                    </button>\n                </div>\n                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">\n                    ').concat(renderEpisodes(currentVideoTitle, sourceCode, parsedEpisodes), "\n                </div>\n            ");
    } else {
      modalContent.innerHTML = '<p class="text-center text-gray-400 py-8">没有找到可播放的视频</p>';
    }
    if (modal) modal.classList.remove("hidden");
  } catch (error) {
    console.error("获取详情错误:", error);
    let errorMsg = "获取详情失败，请稍后重试";
    if (error && error.message && error.message.toLowerCase().includes("json")) {
      errorMsg = "获取详情失败：返回的数据格式不是有效的JSON。";
    } else if (error && error.message) {
      errorMsg = "获取详情失败：".concat(error.message);
    }
    if (typeof showToast === "function") showToast(errorMsg, "error");
    else console.error(errorMsg);
  } finally {
    if (typeof hideLoading === "function") hideLoading();
    else console.log("Details loading complete.");
  }
}
function renderEpisodes(vodName, sourceCode, parsedEpisodesArray) {
  if (!parsedEpisodesArray || parsedEpisodesArray.length === 0) return "";
  const episodesToRender = episodesReversed ? parsedEpisodesArray.slice().reverse() : parsedEpisodesArray.slice();
  return episodesToRender.map((episodeData, loopIndex) => {
    const originalUrl = episodeData.url;
    let realIndex = currentEpisodes.indexOf(originalUrl);
    if (realIndex === -1) {
      realIndex = episodesReversed ? parsedEpisodesArray.length - 1 - loopIndex : loopIndex;
    }
    const safeEpisodeUrl = (episodeData.url || "").replace(/"/g, '"');
    const safeVodName = (vodName || "").replace(/"/g, '"');
    const displayEpisodeText = "第".concat(loopIndex + 1, "集");
    const tooltipText = (episodeData.name || displayEpisodeText).replace(/</g, "<").replace(/>/g, ">");
    return '\n            <button id="episode-'.concat(realIndex, "\" onclick=\"if(typeof playVideo === 'function') playVideo('").concat(safeEpisodeUrl, "','").concat(safeVodName, "', '").concat(sourceCode, "', ").concat(realIndex, '); else console.error(\'playVideo not defined\')" \n                    class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn truncate" title="').concat(tooltipText, '">\n                ').concat(displayEpisodeText, "\n            </button>\n        ");
  }).join("");
}
function copyLinks() {
  const episodes = episodesReversed ? currentEpisodes.slice().reverse() : currentEpisodes;
  const linkList = episodes.join("\r\n");
  navigator.clipboard.writeText(linkList).then(() => {
    if (typeof showToast === "function") showToast("播放链接已复制", "success");
    else console.log("Links copied.");
  }).catch((err) => {
    if (typeof showToast === "function") showToast("复制失败，请检查浏览器权限", "error");
    else console.error("Copy failed:", err);
  });
}
function toggleEpisodeOrder(sourceCode) {
  episodesReversed = !episodesReversed;
  const episodesGrid = document.getElementById("episodesGrid");
  if (episodesGrid) {
    const tempParsedEpisodes = currentEpisodes.map((url, index) => ({ name: "第 ".concat(index + 1, " 集"), url }));
    episodesGrid.innerHTML = renderEpisodes(currentVideoTitle, sourceCode, tempParsedEpisodes);
  }
  const toggleBtn = document.querySelector("button[onclick=\"toggleEpisodeOrder('".concat(sourceCode, "')\"]"));
  if (toggleBtn) {
    toggleBtn.querySelector("span").textContent = episodesReversed ? "正序排列" : "倒序排列";
    const arrowIcon = toggleBtn.querySelector("svg");
    if (arrowIcon) {
      arrowIcon.style.transform = episodesReversed ? "rotate(180deg)" : "rotate(0deg)";
    }
  }
}
