window.addEventListener("pageshow", function(event) {
  const lastSearchQuery = sessionStorage.getItem("lastSearchQuery");
  const lastPageView = sessionStorage.getItem("lastPageView");
  console.log("[Pageshow] Event:", event.type, "Persisted:", event.persisted, "LastPageView:", lastPageView, "Query:", lastSearchQuery);
  if (lastPageView === "searchResults" && lastSearchQuery) {
    document.getElementById("searchInput").value = lastSearchQuery;
    if (event.persisted) {
      console.log("[Pageshow-bfcache] Restoring search results view for query:", lastSearchQuery);
      document.getElementById("searchArea").classList.remove("flex-1");
      document.getElementById("searchArea").classList.add("mb-8");
      document.getElementById("resultsArea").classList.remove("hidden");
      const doubanArea = document.getElementById("doubanArea");
      if (doubanArea) doubanArea.classList.add("hidden");
    } else {
      console.log("[Pageshow-fullload] Search results were expected. initializeApp should handle re-search.");
    }
  } else {
    if (event.persisted) {
      console.log("[Pageshow-bfcache] Restoring default/Douban view.");
      document.getElementById("searchArea").classList.add("flex-1");
      document.getElementById("searchArea").classList.remove("mb-8");
      document.getElementById("resultsArea").classList.add("hidden");
      if (typeof updateDoubanVisibility === "function") {
        updateDoubanVisibility();
      }
    } else {
      console.log("[Pageshow-fullload] Default/Douban view expected. initializeApp will handle.");
    }
  }
});
function initializeApp() {
  console.log("[AppInit] Tauri API ready, initializing app.");
  if (typeof initAPICheckboxes === "function") initAPICheckboxes();
  else console.error("initAPICheckboxes not found");
  if (typeof renderCustomAPIsList === "function") renderCustomAPIsList();
  else console.error("renderCustomAPIsList not found");
  if (typeof updateSelectedApiCount === "function") updateSelectedApiCount();
  else console.error("updateSelectedApiCount not found");
  if (typeof renderSearchHistory === "function") renderSearchHistory();
  else console.warn("renderSearchHistory not found, assuming it's in another module like ui.js or history.js");
  if (!localStorage.getItem("hasInitializedDefaults")) {
    selectedAPIs = ["tyyszy", "xiaomaomi", "bfzy", "dyttzy", "ruyi"];
    localStorage.setItem("selectedAPIs", JSON.stringify(selectedAPIs));
    localStorage.setItem("yellowFilterEnabled", "true");
    localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, "true");
    localStorage.setItem("doubanEnabled", "true");
    localStorage.setItem("doubanApiMode", "false");
    localStorage.setItem("hasInitializedDefaults", "true");
  }
  const yellowFilterToggle = document.getElementById("yellowFilterToggle");
  if (yellowFilterToggle) {
    yellowFilterToggle.checked = localStorage.getItem("yellowFilterEnabled") === "true";
  }
  const adFilterToggle = document.getElementById("adFilterToggle");
  if (adFilterToggle) {
    adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== "false";
  }
  const doubanApiModeToggle = document.getElementById("doubanApiModeToggle");
  if (doubanApiModeToggle) {
    const useNewAndOldApi = localStorage.getItem("doubanApiMode") !== "false";
    doubanApiModeToggle.checked = useNewAndOldApi;
    const toggleBg = doubanApiModeToggle.nextElementSibling;
    const toggleDot = toggleBg ? toggleBg.nextElementSibling : null;
    if (toggleBg && toggleDot) {
      if (useNewAndOldApi) {
        toggleBg.classList.add("bg-pink-600");
        toggleDot.classList.add("translate-x-6");
      } else {
        toggleBg.classList.remove("bg-pink-600");
        toggleDot.classList.remove("translate-x-6");
      }
    }
  }
  if (typeof setupEventListeners === "function") setupEventListeners();
  else console.error("setupEventListeners not found");
  if (typeof checkAdultAPIsSelected === "function") setTimeout(checkAdultAPIsSelected, 100);
  else console.error("checkAdultAPIsSelected not found");
  if (typeof initDouban === "function") {
    if (typeof window.justReturnedFromPlayer === "undefined") {
      window.justReturnedFromPlayer = false;
    }
    initDouban();
  } else {
    console.warn("[AppInit] initDouban function not found.");
  }
  const lastSearchQuery = sessionStorage.getItem("lastSearchQuery");
  const lastPageView = sessionStorage.getItem("lastPageView");
  const currentActiveTab = sessionStorage.getItem("activeTab") || "home";
  if (currentActiveTab === "search" && lastSearchQuery && lastPageView === "searchResults") {
    console.log("[InitializeApp] Active tab is SEARCH, and last view was search results. Restoring search:", lastSearchQuery);
    document.getElementById("searchInput").value = lastSearchQuery;
    if (typeof search === "function") {
      search();
    } else {
      console.error("search function not found");
    }
  } else if (currentActiveTab === "home") {
    console.log("[InitializeApp] Active tab is HOME. Ensuring Douban content is initialized if needed.");
    let homeRestoredSuccessfully = false;
    const homePageStateRaw = sessionStorage.getItem("homePageState");
    if (homePageStateRaw) {
      try {
        const homePageState = JSON.parse(homePageStateRaw);
        if (homePageState.viewMode === "main" && homePageState.homePageHTML || homePageState.viewMode === "category") {
          homeRestoredSuccessfully = true;
          console.log("[InitializeApp] Home page state seems to have been restored by navigateToTab.");
        }
      } catch (e) {
        console.warn("[InitializeApp] Could not parse homePageState for check.");
      }
    }
    if (!homeRestoredSuccessfully && typeof initDouban === "function") {
      console.log("[InitializeApp] Home state not fully restored or absent, calling initDouban to populate.");
      initDouban();
    } else if (!homeRestoredSuccessfully) {
      console.warn("[InitializeApp] initDouban function not found, and home state not restored/absent.");
    }
  }
  console.log("[InitializeApp] Finished specific initializations based on active tab:", currentActiveTab);
}
function whenTauriApiReady(callback) {
  if (typeof tauriConstants !== "undefined" && tauriConstants.invoke) {
    console.log("[AppInit] Tauri API (via tauriConstants.invoke) is immediately available.");
    callback();
  } else {
    let attempts = 0;
    const maxAttempts = 100;
    const intervalTime = 100;
    console.log("[AppInit] Tauri API (via tauriConstants.invoke) not immediately available. Starting polling...");
    const interval = setInterval(() => {
      attempts++;
      if (attempts === 1 || attempts % 50 === 0 || attempts === maxAttempts) {
        console.log(`[AppInit Polling Attempt ${attempts}] Checking for tauriConstants.invoke...`);
        if (typeof tauriConstants !== "undefined" && tauriConstants.invoke) {
          console.log(`[AppInit Polling Attempt ${attempts}] tauriConstants.invoke is now available.`);
        } else {
          console.log(`[AppInit Polling Attempt ${attempts}] tauriConstants.invoke is still NOT available.`);
        }
      }
      if (typeof tauriConstants !== "undefined" && tauriConstants.invoke) {
        clearInterval(interval);
        console.log(`[AppInit] Tauri API (via tauriConstants.invoke) became available after ${attempts} attempts.`);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("[AppInit] Tauri API (via tauriConstants.invoke) did not become available after " + maxAttempts * intervalTime / 1e3 + " seconds. App might not function correctly.");
        callback();
      }
    }, intervalTime);
  }
}
document.addEventListener("DOMContentLoaded", function() {
  console.log("[AppInit] DOMContentLoaded event fired.");
  whenTauriApiReady(initializeApp);
});
