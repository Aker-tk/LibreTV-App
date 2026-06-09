function playVideo(url, vod_name, sourceCode, episodeIndex = 0) {
  if (window.isPasswordProtected && window.isPasswordVerified) {
    if (window.isPasswordProtected() && !window.isPasswordVerified()) {
      showPasswordModal && showPasswordModal();
      return;
    }
  }
  if (!url) {
    showToast("无效的视频链接", "error");
    return;
  }
  let sourceName = "";
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) {
    const sourceSpan = modalTitle.querySelector("span.text-gray-400");
    if (sourceSpan) {
      const sourceText = sourceSpan.textContent;
      const match = sourceText.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        sourceName = match[1].trim();
      }
    }
  }
  const currentVideoTitleForStorage = vod_name;
  localStorage.setItem("currentVideoTitle", currentVideoTitleForStorage);
  localStorage.setItem("currentEpisodeIndex", episodeIndex);
  localStorage.setItem("currentEpisodes", JSON.stringify(currentEpisodes));
  localStorage.setItem("episodesReversed", episodesReversed);
  const modal = document.getElementById("modal");
  if (modal) {
    modal.classList.add("hidden");
    console.log("[AppPlayVideo] Detail modal hidden.");
  } else {
    console.warn("[AppPlayVideo] Detail modal element not found to hide.");
  }
  const videoTitleForHistory = vod_name || currentVideoTitle;
  const videoInfo = {
    title: videoTitleForHistory,
    url,
    episodeIndex,
    sourceName,
    timestamp: Date.now(),
    episodes: currentEpisodes && currentEpisodes.length > 0 ? [...currentEpisodes] : []
  };
  if (typeof addToViewingHistory === "function") {
    addToViewingHistory(videoInfo);
  }
  const playerUrl = `player.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoTitleForHistory)}&index=${episodeIndex}&source=${encodeURIComponent(sourceName)}&source_code=${encodeURIComponent(sourceCode)}`;
  showVideoPlayer(playerUrl);
}
function showVideoPlayer(url) {
  console.log("[AppNavigation] Navigating to player URL:", url);
  window.location.href = url;
}
function closeVideoPlayer() {
  console.log("[AppNavigation] closeVideoPlayer called. With full page navigation for player, this function might be obsolete or behave differently.");
  const resultsArea = document.getElementById("resultsArea");
  if (resultsArea && resultsArea.classList.contains("hidden")) {
    resultsArea.classList.remove("hidden");
    console.log("[AppNavigation] Made resultsArea visible upon returning to index.html (if closeVideoPlayer is somehow still called).");
  }
  if (typeof resetSearchArea === "function") {
    console.log("[AppNavigation] Calling resetSearchArea if closeVideoPlayer is still triggered.");
    resetSearchArea();
  }
}
function playPreviousEpisode(sourceCode) {
  if (currentEpisodeIndex > 0) {
    const prevIndex = currentEpisodeIndex - 1;
    const prevUrl = currentEpisodes[prevIndex];
    playVideo(prevUrl, currentVideoTitle, sourceCode, prevIndex);
  }
}
function playNextEpisode(sourceCode) {
  if (currentEpisodeIndex < currentEpisodes.length - 1) {
    const nextIndex = currentEpisodeIndex + 1;
    const nextUrl = currentEpisodes[nextIndex];
    playVideo(nextUrl, currentVideoTitle, sourceCode, nextIndex);
  }
}
function handlePlayerError() {
  hideLoading();
  showToast("视频播放加载失败，请尝试其他视频源", "error");
}
