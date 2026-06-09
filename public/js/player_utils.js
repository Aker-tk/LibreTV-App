function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.altKey && e.key === "ArrowLeft" && currentEpisodeIndex > 0) {
    playPreviousEpisode();
    showShortcutHint("上一集", "left");
    e.preventDefault();
  }
  if (e.altKey && e.key === "ArrowRight" && currentEpisodeIndex < currentEpisodes.length - 1) {
    playNextEpisode();
    showShortcutHint("下一集", "right");
    e.preventDefault();
  }
}
function saveToHistory() {
  if (!currentEpisodes || currentEpisodes.length === 0 || !currentVideoUrl) {
    console.warn("没有可用的剧集列表或视频URL，无法保存完整的历史记录");
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const sourceName = urlParams.get("source") || "";
  const sourceCode = urlParams.get("source_code") || "";
  let currentPosition = 0;
  let videoDuration = 0;
  if (dp && dp.video) {
    currentPosition = dp.video.currentTime;
    videoDuration = dp.video.duration;
  }
  const videoInfo = {
    title: currentVideoTitle,
    directVideoUrl: currentVideoUrl,
    url: "player.html?url=".concat(encodeURIComponent(currentVideoUrl), "&title=").concat(encodeURIComponent(currentVideoTitle), "&source=").concat(encodeURIComponent(sourceName), "&source_code=").concat(encodeURIComponent(sourceCode), "&index=").concat(currentEpisodeIndex, "&position=").concat(Math.floor(currentPosition || 0)),
    episodeIndex: currentEpisodeIndex,
    sourceName,
    timestamp: Date.now(),
    playbackPosition: currentPosition,
    duration: videoDuration,
    episodes: currentEpisodes && currentEpisodes.length > 0 ? currentEpisodes.slice() : []
  };
  try {
    const history = JSON.parse(localStorage.getItem("viewingHistory") || "[]");
    const existingIndex = history.findIndex((item) => item.title === videoInfo.title);
    if (existingIndex !== -1) {
      history[existingIndex].episodeIndex = currentEpisodeIndex;
      history[existingIndex].timestamp = Date.now();
      history[existingIndex].sourceName = sourceName;
      history[existingIndex].directVideoUrl = currentVideoUrl;
      history[existingIndex].playbackPosition = currentPosition > 10 ? currentPosition : history[existingIndex].playbackPosition;
      history[existingIndex].duration = videoDuration || history[existingIndex].duration;
      history[existingIndex].url = videoInfo.url;
      if (currentEpisodes && currentEpisodes.length > 0) {
        if (!history[existingIndex].episodes || !Array.isArray(history[existingIndex].episodes) || history[existingIndex].episodes.length !== currentEpisodes.length) {
          history[existingIndex].episodes = currentEpisodes.slice();
        }
      }
      const updatedItem = history.splice(existingIndex, 1)[0];
      history.unshift(updatedItem);
    } else {
      history.unshift(videoInfo);
    }
    if (history.length > 50) history.splice(50);
    localStorage.setItem("viewingHistory", JSON.stringify(history));
    console.log("成功保存历史记录");
  } catch (e) {
    console.error("保存观看历史失败:", e);
  }
}
function startProgressSaveInterval() {
  if (progressSaveInterval) clearInterval(progressSaveInterval);
  progressSaveInterval = setInterval(saveCurrentProgress, 3e4);
}
function saveCurrentProgress() {
  if (!dp || !dp.video) return;
  const currentTime = dp.video.currentTime;
  const duration = dp.video.duration;
  if (!duration || currentTime < 1) return;
  const progressKey = "videoProgress_".concat(getVideoId());
  const progressData = { position: currentTime, duration, timestamp: Date.now() };
  try {
    localStorage.setItem(progressKey, JSON.stringify(progressData));
    const historyRaw = localStorage.getItem("viewingHistory");
    if (historyRaw) {
      const history = JSON.parse(historyRaw);
      const idx = history.findIndex((item) => item.title === currentVideoTitle && (item.episodeIndex === void 0 || item.episodeIndex === currentEpisodeIndex));
      if (idx !== -1) {
        if (Math.abs((history[idx].playbackPosition || 0) - currentTime) > 2 || Math.abs((history[idx].duration || 0) - duration) > 2) {
          history[idx].playbackPosition = currentTime;
          history[idx].duration = duration;
          history[idx].timestamp = Date.now();
          localStorage.setItem("viewingHistory", JSON.stringify(history));
        }
      }
    }
  } catch (e) {
    console.error("保存播放进度失败", e);
  }
}
function clearVideoProgress() {
  const progressKey = "videoProgress_".concat(getVideoId());
  try {
    localStorage.removeItem(progressKey);
    console.log("已清除播放进度记录");
  } catch (e) {
    console.error("清除播放进度记录失败", e);
  }
}
function getVideoId() {
  if (currentVideoUrl) return "".concat(encodeURIComponent(currentVideoUrl));
  return "".concat(encodeURIComponent(currentVideoTitle), "_").concat(currentEpisodeIndex);
}
function setupLongPressSpeedControl() {
  if (!dp || !dp.video) return;
  const playerElement = document.getElementById("player");
  let longPressTimer = null;
  let originalPlaybackRate = 1;
  let isLongPress = false;
  function showSpeedHint(speed) {
    showShortcutHint("".concat(speed, "倍速"), "right");
  }
  playerElement.oncontextmenu = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const dplayerMenu = document.querySelector(".dplayer-menu");
      const dplayerMask = document.querySelector(".dplayer-mask");
      if (dplayerMenu) dplayerMenu.style.display = "none";
      if (dplayerMask) dplayerMask.style.display = "none";
      return false;
    }
    return true;
  };
  playerElement.addEventListener("touchstart", function(e) {
    if (dp.video.paused) return;
    originalPlaybackRate = dp.video.playbackRate;
    longPressTimer = setTimeout(() => {
      if (dp.video.paused) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        return;
      }
      dp.video.playbackRate = 3;
      isLongPress = true;
      showSpeedHint(3);
      e.preventDefault();
    }, 500);
  }, { passive: false });
  playerElement.addEventListener("touchend", function(e) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (isLongPress) {
      dp.video.playbackRate = originalPlaybackRate;
      isLongPress = false;
      showSpeedHint(originalPlaybackRate);
      e.preventDefault();
    }
  });
  playerElement.addEventListener("touchcancel", function() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (isLongPress) {
      dp.video.playbackRate = originalPlaybackRate;
      isLongPress = false;
    }
  });
  playerElement.addEventListener("touchmove", function(e) {
    if (isLongPress) e.preventDefault();
  }, { passive: false });
  dp.video.addEventListener("pause", function() {
    if (isLongPress) {
      dp.video.playbackRate = originalPlaybackRate;
      isLongPress = false;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });
}
let controlsLocked = false;
function toggleControlsLock() {
  const container = document.getElementById("playerContainer");
  controlsLocked = !controlsLocked;
  container.classList.toggle("controls-locked", controlsLocked);
  const desktopIcon = document.getElementById("lockIcon");
  if (desktopIcon) {
    desktopIcon.innerHTML = controlsLocked ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11V7a3 3 0 00-6 0v4m-3 4h12v6H6v-6z"></path>';
  }
  const mobileIcon = document.getElementById("mobileLockIcon");
  const mobileText = document.getElementById("mobileLockText");
  const mobileButton = document.getElementById("mobileLockToggle");
  if (mobileIcon) {
    mobileIcon.innerHTML = controlsLocked ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11V7a3 3 0 00-6 0v4m-3 4h12v6H6v-6z"></path>';
  }
  if (mobileText) {
    mobileText.textContent = controlsLocked ? "解锁" : "锁定";
  }
  if (mobileButton) {
    if (controlsLocked) {
      mobileButton.classList.add("active");
    } else {
      mobileButton.classList.remove("active");
    }
  }
}
