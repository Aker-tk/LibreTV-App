(function() {
  const style = document.createElement("style");
  style.textContent = "\n        @keyframes pulse {\n            0%, 100% {\n                opacity: 1;\n            }\n            50% {\n                opacity: 0.6;\n            }\n        }\n        .animate-pulse {\n            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n        }\n    ";
  document.head.appendChild(style);
})();
const VERSION_URL = {
  PROXY: "https://raw.ihtw.moe/raw.githubusercontent.com/LibreSpark/LibreTV/main/VERSION.txt",
  DIRECT: "https://raw.githubusercontent.com/LibreSpark/LibreTV/main/VERSION.txt"
};
async function fetchVersion(url, errorMessage, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return await response.text();
}
async function fetchVersionViaTauri(url) {
  const response = await tauriConstants.invoke("make_http_request", {
    options: {
      url,
      method: "GET",
      timeout_secs: tauriConstants.TIMEOUT_SECS,
      response_as_text: true
    }
  });
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error("Tauri version request failed with status ".concat(response ? response.status : "unknown"));
  }
  return response.body;
}
async function resolveLatestVersion() {
  if (isLikelyTauriEnvironment() && tauriConstants.invoke) {
    try {
      const latestVersion2 = await fetchVersionViaTauri(VERSION_URL.PROXY);
      console.log("通过 Tauri 原生请求代理地址获取版本成功");
      return latestVersion2;
    } catch (proxyError) {
      console.log("Tauri 代理请求失败，尝试 Tauri 直连:", proxyError.message);
      const latestVersion2 = await fetchVersionViaTauri(VERSION_URL.DIRECT);
      console.log("通过 Tauri 原生直连获取版本成功");
      return latestVersion2;
    }
  }
  try {
    const latestVersion2 = await fetchVersion(VERSION_URL.PROXY, "代理请求失败");
    console.log("通过代理服务器获取版本成功");
    return latestVersion2;
  } catch (proxyError) {
    console.log("代理请求失败，尝试直接请求:", proxyError.message);
    const latestVersion2 = await fetchVersion(VERSION_URL.DIRECT, "获取最新版本失败");
    console.log("直接请求获取版本成功");
    return latestVersion2;
  }
}
async function checkForUpdates() {
  try {
    console.log("[VersionCheck] typeof window.APP_VERSION:", typeof window.APP_VERSION);
    console.log("[VersionCheck] window.APP_VERSION value:", window.APP_VERSION);
    const currentVersion = window.APP_VERSION || "unknown_local_version";
    let latestVersion;
    try {
      latestVersion = await resolveLatestVersion();
    } catch (versionError) {
      console.error("所有版本检查请求均失败:", versionError);
      throw new Error("无法获取最新版本信息");
    }
    console.log("当前版本:", currentVersion);
    console.log("最新版本:", latestVersion);
    const cleanCurrentVersion = currentVersion.trim();
    const cleanLatestVersion = latestVersion.trim();
    return {
      current: cleanCurrentVersion,
      latest: cleanLatestVersion,
      hasUpdate: parseInt(cleanLatestVersion) > parseInt(cleanCurrentVersion),
      currentFormatted: formatVersion(cleanCurrentVersion),
      latestFormatted: formatVersion(cleanLatestVersion)
    };
  } catch (error) {
    console.error("版本检测出错:", error);
    throw error;
  }
}
function formatVersion(versionString) {
  if (!versionString) {
    return "未知版本";
  }
  const cleanedString = versionString.trim();
  if (cleanedString.length === 12) {
    const year = cleanedString.substring(0, 4);
    const month = cleanedString.substring(4, 6);
    const day = cleanedString.substring(6, 8);
    const hour = cleanedString.substring(8, 10);
    const minute = cleanedString.substring(10, 12);
    return "".concat(year, "-").concat(month, "-").concat(day, " ").concat(hour, ":").concat(minute);
  }
  return cleanedString;
}
function createErrorVersionElement(errorMessage) {
  const errorElement = document.createElement("p");
  errorElement.className = "text-gray-500 text-sm mt-1 text-center md:text-left";
  errorElement.innerHTML = '版本: <span class="text-amber-500">检测失败</span>';
  errorElement.title = errorMessage;
  return errorElement;
}
function addVersionInfoToFooter() {
  checkForUpdates().then((result) => {
    if (!result) {
      const versionElement2 = createErrorVersionElement();
      displayVersionElement(versionElement2);
      return;
    }
    const versionElement = document.createElement("p");
    versionElement.className = "text-gray-500 text-sm mt-1 text-center md:text-left";
    versionElement.innerHTML = "版本: ".concat(result.currentFormatted);
    if (result.hasUpdate) {
      versionElement.innerHTML += ' <span class="inline-flex items-center bg-red-600 text-white text-xs px-2 py-0.5 rounded-md ml-1 cursor-pointer animate-pulse font-medium">\n                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />\n                </svg>\n                发现新版\n            </span>';
      setTimeout(() => {
        const updateBtn = versionElement.querySelector("span");
        if (updateBtn) {
          updateBtn.addEventListener("click", () => {
            window.open("https://github.com/LibreSpark/LibreTV", "_blank");
          });
        }
      }, 100);
    } else {
      versionElement.innerHTML = "版本: ".concat(result.currentFormatted, ' <span class="text-green-500">(最新版本)</span>');
    }
    displayVersionElement(versionElement);
  }).catch((error) => {
    console.error("版本检测出错:", error);
    const errorElement = createErrorVersionElement("错误信息: ".concat(error.message));
    displayVersionElement(errorElement);
  });
}
function displayVersionElement(element) {
  const footerElement = document.querySelector(".footer p.text-gray-500.text-sm");
  if (footerElement) {
    footerElement.insertAdjacentElement("afterend", element);
  } else {
    const footer = document.querySelector(".footer .container");
    if (footer) {
      footer.querySelector("div").appendChild(element);
    }
  }
}
document.addEventListener("DOMContentLoaded", addVersionInfoToFooter);
