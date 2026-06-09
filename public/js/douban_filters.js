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
console.log("douban_filters.js loaded");
const doubanFilterOptions = {
  contentType: {
    paramName: "tags",
    label: "筛选内容",
    options: ["全部", "电影", "电视剧", "综艺", "动画", "纪录片", "短片"]
  },
  theme: {
    paramName: "genres",
    label: "筛选主题",
    options: ["全部", "喜剧", "爱情", "动作", "科幻", "动画", "悬疑", "犯罪", "惊悚", "冒险", "音乐", "历史", "奇幻", "恐怖", "战争", "传记", "歌舞", "武侠", "情色", "灾难", "西部", "纪录片", "短片"]
  },
  region: {
    paramName: "countries",
    label: "地区",
    options: ["全部", "中国大陆", "美国", "香港", "台湾", "日本", "韩国", "英国", "法国", "德国", "意大利", "西班牙", "印度", "泰国", "俄罗斯", "伊朗", "加拿大", "澳大利亚", "爱尔兰", "瑞典", "巴西", "丹麦"]
  },
  sortBy: {
    // For New API
    paramName: "sort",
    label: "排序方式",
    options: [{ name: "按热度排序", value: "T" }, { name: "按时间排序", value: "R" }, { name: "按评分排序", value: "S" }],
    defaultValue: "S"
  }
};
window.currentSearchPageFilters = {
  tags: "",
  genres: "",
  countries: "",
  sort: doubanFilterOptions.sortBy.defaultValue,
  start: 0,
  range: "0,10"
};
window.currentOldApiFilters = {
  selectedContentType: "电影",
  selectedTheme: "热门",
  selectedRegion: "",
  // Region filter is removed, but keep state for consistency
  apiType: "movie",
  // Will be derived from '电影'
  apiTag: "电影",
  // Base tag for '电影', will be overridden by selectedTheme '热门'
  sort: "recommend",
  // Default to '综合排序'
  start: 0
};
window.userAddedOldApiTags = [];
const USER_ADDED_TAGS_STORAGE_KEY = "doubanUserAddedOldApiTags";
function loadUserAddedOldApiTags() {
  const storedTags = localStorage.getItem(USER_ADDED_TAGS_STORAGE_KEY);
  if (storedTags) {
    try {
      window.userAddedOldApiTags = JSON.parse(storedTags);
    } catch (e) {
      console.error("Error parsing user-added tags:", e);
      window.userAddedOldApiTags = [];
    }
  } else {
    window.userAddedOldApiTags = [];
  }
}
function saveUserAddedOldApiTags() {
  try {
    localStorage.setItem(USER_ADDED_TAGS_STORAGE_KEY, JSON.stringify(window.userAddedOldApiTags));
  } catch (e) {
    console.error("Error saving user-added tags:", e);
  }
}
loadUserAddedOldApiTags();
window.DOUBAN_FILTER_ITEMS_PER_PAGE = 20;
window.isLoadingSearchPageFilters = false;
window.noMoreSearchPageFilterItems = false;
window.allButtonGroups = [];
function createFilterButton(text, filterKey, filterValue, isActive, clickHandler, isSpecial = false) {
  const button = document.createElement("button");
  button.textContent = text;
  button.dataset.filterKey = filterKey;
  button.dataset.filterValue = filterValue;
  button.className = "px-3 py-1.5 text-sm font-medium rounded-md border transition-colors duration-200 ".concat(isActive ? "bg-pink-600 text-white border-pink-500" : isSpecial ? "bg-green-600 hover:bg-green-700 text-white border-green-500" : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white");
  button.onclick = clickHandler;
  return button;
}
function initDoubanFilterControls(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Filter container with id '".concat(containerId, "' not found."));
    return;
  }
  container.innerHTML = "";
  window.allButtonGroups = [];
  const useOnlyOldApi = localStorage.getItem("doubanApiMode") === "false";
  if (useOnlyOldApi) {
    const savedStateRaw = sessionStorage.getItem("filterPageState");
    let restoredOldFilters = false;
    if (savedStateRaw) {
      try {
        const savedState = JSON.parse(savedStateRaw);
        if (savedState.mode === "oldApi" && savedState.filters) {
          const defaultOldFilters = { selectedContentType: "全部", selectedTheme: "", selectedRegion: "", apiType: "movie", apiTag: "热门", sort: "rank", start: 0 };
          window.currentOldApiFilters = __spreadValues(__spreadValues({}, defaultOldFilters), savedState.filters);
          restoredOldFilters = true;
        }
      } catch (e) {
        console.error("Error parsing saved filter state for old API", e);
      }
    }
    if (!restoredOldFilters) {
      window.currentOldApiFilters = {
        selectedContentType: "全部",
        selectedTheme: "",
        selectedRegion: "",
        apiType: "movie",
        apiTag: "热门",
        sort: "rank",
        start: 0
      };
    }
    initOldApiFilterUIWithMatchedButtons(containerId);
  } else {
    if (!window.currentSearchPageFilters || Object.keys(window.currentSearchPageFilters).length === 0 || !sessionStorage.getItem("filterPageState")) {
      window.currentSearchPageFilters = {
        tags: "",
        genres: "",
        countries: "",
        sort: doubanFilterOptions.sortBy.defaultValue,
        start: 0,
        range: "0,10"
      };
    }
    window.currentSearchPageFilters.start = 0;
    Object.keys(doubanFilterOptions).forEach((filterConfigKey) => {
      const filterGroupConfig = doubanFilterOptions[filterConfigKey];
      const groupDiv = document.createElement("div");
      groupDiv.className = "mb-4";
      const label = document.createElement("h4");
      label.className = "text-lg font-semibold text-gray-300 mb-2";
      label.textContent = filterGroupConfig.label;
      groupDiv.appendChild(label);
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "flex flex-wrap gap-2";
      window.allButtonGroups.push({ key: filterGroupConfig.paramName, element: buttonsDiv });
      filterGroupConfig.options.forEach((option) => {
        const optionValue = typeof option === "object" ? option.value : option;
        const optionName = typeof option === "object" ? option.name : option;
        const clickHandler = () => {
          if (optionName === "全部") {
            window.currentSearchPageFilters[filterGroupConfig.paramName] = "";
            if (filterGroupConfig.paramName === "tags") {
              window.currentSearchPageFilters.tags = "";
            }
          } else {
            window.currentSearchPageFilters[filterGroupConfig.paramName] = optionValue;
          }
          updateAllButtonActiveStates();
          applySearchPageFilters();
        };
        let isActive = false;
        if (filterGroupConfig.paramName === "sort") {
          isActive = optionValue === window.currentSearchPageFilters.sort;
        } else if (filterGroupConfig.paramName === "tags") {
          if (optionName === "全部") isActive = window.currentSearchPageFilters.tags === "";
          else isActive = optionValue === window.currentSearchPageFilters.tags;
        } else {
          isActive = optionValue === window.currentSearchPageFilters[filterGroupConfig.paramName] || optionName === "全部" && !window.currentSearchPageFilters[filterGroupConfig.paramName];
        }
        const button = createFilterButton(optionName, filterGroupConfig.paramName, optionValue, isActive, clickHandler);
        buttonsDiv.appendChild(button);
      });
      groupDiv.appendChild(buttonsDiv);
      container.appendChild(groupDiv);
    });
  }
}
function initOldApiFilterUIWithMatchedButtons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const defaultFilters = {
    selectedContentType: "电影",
    selectedTheme: "热门",
    selectedRegion: "",
    apiType: "movie",
    apiTag: "电影",
    // Base tag for '电影'
    sort: "recommend",
    start: 0
  };
  window.currentOldApiFilters = __spreadValues(__spreadValues({}, defaultFilters), window.currentOldApiFilters);
  if (window.currentOldApiFilters.selectedContentType === "全部") {
    window.currentOldApiFilters.selectedContentType = "电影";
  }
  const oldApiPrimaryTypeOptions = [
    { name: "电影", value: "电影", apiType: "movie", primaryTag: "电影" },
    { name: "电视剧", value: "电视剧", apiType: "tv", primaryTag: "热门" }
  ];
  let currentSelectedContentTypeOpt = oldApiPrimaryTypeOptions.find((opt) => opt.name === window.currentOldApiFilters.selectedContentType);
  if (!currentSelectedContentTypeOpt) {
    window.currentOldApiFilters.selectedContentType = "电影";
    currentSelectedContentTypeOpt = oldApiPrimaryTypeOptions.find((opt) => opt.name === "电影");
  }
  window.currentOldApiFilters.apiType = currentSelectedContentTypeOpt.apiType;
  window.currentOldApiFilters.apiTag = currentSelectedContentTypeOpt.primaryTag;
  if (window.currentOldApiFilters.selectedTheme === "全部" || window.currentOldApiFilters.selectedTheme === "") {
    window.currentOldApiFilters.selectedTheme = "热门";
  }
  const commonMovieTags = ["热门", "最新", "经典", "豆瓣高分", "冷门佳片", "华语", "欧美", "韩国", "日本", "动作", "喜剧", "爱情", "科幻", "悬疑", "恐怖", "治愈", "动画", "综艺", "纪录片", "短片"];
  const commonTvTags = ["热门", "美剧", "英剧", "韩剧", "日剧", "国产剧", "港剧", "日本动画", "综艺", "纪录片", "动画", "短片"];
  if (window.currentOldApiFilters.apiType === "movie" && !commonMovieTags.includes(window.currentOldApiFilters.selectedTheme)) {
  } else if (window.currentOldApiFilters.apiType === "tv" && !commonTvTags.includes(window.currentOldApiFilters.selectedTheme)) {
  }
  const createOldApiButtonGroup = (label, options, currentSelectionInState, filterPropertyToUpdate, isPrimaryContentTypeGroup = false) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "mb-4";
    groupDiv.innerHTML = '<h4 class="text-lg font-semibold text-gray-300 mb-2">'.concat(label, "</h4>");
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "flex flex-wrap gap-2";
    options.forEach((opt) => {
      const buttonName = opt.name;
      const buttonValue = opt.value;
      let isActive = currentSelectionInState === buttonValue;
      if (buttonName === "全部" && (currentSelectionInState === "" || currentSelectionInState === "全部")) {
        isActive = true;
      }
      const clickHandler = () => {
        if (buttonName === "全部") {
          if (filterPropertyToUpdate === "sort") {
            window.currentOldApiFilters[filterPropertyToUpdate] = "recommend";
          } else {
            window.currentOldApiFilters[filterPropertyToUpdate] = "";
          }
        } else {
          window.currentOldApiFilters[filterPropertyToUpdate] = buttonValue;
          if (isPrimaryContentTypeGroup) {
            const selectedOpt = oldApiPrimaryTypeOptions.find((o) => o.value === buttonValue);
            if (selectedOpt) {
              window.currentOldApiFilters.apiType = selectedOpt.apiType;
              window.currentOldApiFilters.apiTag = selectedOpt.primaryTag;
            }
            window.currentOldApiFilters.selectedTheme = "热门";
            window.currentOldApiFilters.selectedRegion = "";
          }
        }
        initOldApiFilterUIWithMatchedButtons(containerId);
        applyOldApiFilters();
      };
      const button = createFilterButton(buttonName, filterPropertyToUpdate, buttonValue, isActive, clickHandler);
      buttonsDiv.appendChild(button);
    });
    groupDiv.appendChild(buttonsDiv);
    container.appendChild(groupDiv);
  };
  createOldApiButtonGroup("内容类型", oldApiPrimaryTypeOptions, window.currentOldApiFilters.selectedContentType, "selectedContentType", true);
  let effectiveApiTypeForSecondaryTags = window.currentOldApiFilters.apiType;
  const additionalTags = ["动画", "综艺", "纪录片", "短片"];
  let movieSpecificTags = ["热门", "最新", "经典", "豆瓣高分", "冷门佳片", "华语", "欧美", "韩国", "日本", "动作", "喜剧", "爱情", "科幻", "悬疑", "恐怖", "治愈", "剧情", "战争", "奇幻", "冒险", "犯罪", "惊悚", "家庭", "古装", "武侠", "音乐", "歌舞", "传记", "历史", "西部", "黑色电影", "情色", "灾难", "儿童"];
  let tvSpecificTags = ["热门", "最新", "经典", "美剧", "英剧", "韩剧", "日剧", "国产剧", "港剧", "日本动画"];
  const uniqueTags = (items) => Array.from(new Set(items));
  let themeTags;
  if (effectiveApiTypeForSecondaryTags === "tv") {
    themeTags = uniqueTags(tvSpecificTags.concat(additionalTags));
  } else {
    themeTags = uniqueTags(movieSpecificTags.concat(additionalTags));
  }
  let displayableThemeTags = themeTags.slice();
  if (displayableThemeTags.includes("热门")) {
    displayableThemeTags = ["热门"].concat(displayableThemeTags.filter((t) => t !== "热门"));
  }
  const combinedDisplayableTags = uniqueTags(displayableThemeTags.concat(window.userAddedOldApiTags));
  const themeOptions = combinedDisplayableTags.map((tag) => ({ name: tag, value: tag }));
  if (themeOptions.length > 0) {
    createOldApiButtonGroup("标签", themeOptions, window.currentOldApiFilters.selectedTheme, "selectedTheme", false);
  }
  const tagGroupDiv = Array.from(container.querySelectorAll(".mb-4")).find((div) => {
    var _a;
    return ((_a = div.querySelector("h4")) == null ? void 0 : _a.textContent) === "标签";
  });
  if (tagGroupDiv) {
    const buttonsDiv = tagGroupDiv.querySelector(".flex.flex-wrap.gap-2");
    const currentPredefinedThemeTags = themeTags.slice();
    if (buttonsDiv) {
      const addTagButton = createFilterButton("+ 添加标签", "add_custom_tag", "add_custom_tag", false, () => {
        console.log("'+ 添加标签' button clicked in Old API mode.");
        const customTagModal = document.getElementById("customTagModal");
        const customTagInput = document.getElementById("customTagInput");
        const confirmCustomTagBtn = document.getElementById("confirmCustomTagBtn");
        const cancelCustomTagBtn = document.getElementById("cancelCustomTagBtn");
        if (!customTagModal || !customTagInput || !confirmCustomTagBtn || !cancelCustomTagBtn) {
          console.error("Custom tag modal elements not found!");
          alert("添加标签功能出现错误，请刷新页面或联系开发者。");
          return;
        }
        customTagInput.value = "";
        customTagModal.style.display = "flex";
        customTagInput.focus();
        const handleConfirm = () => {
          const newTagName = customTagInput.value.trim();
          console.log("Custom modal confirm, tag name: ", newTagName);
          if (newTagName !== "") {
            if (!window.userAddedOldApiTags.includes(newTagName) && !currentPredefinedThemeTags.includes(newTagName)) {
              window.userAddedOldApiTags.push(newTagName);
              saveUserAddedOldApiTags();
              window.currentOldApiFilters.selectedTheme = newTagName;
              initOldApiFilterUIWithMatchedButtons(containerId);
              applyOldApiFilters();
            } else {
              alert("标签已存在或与预定义标签重复。");
            }
          }
          closeCustomModal();
        };
        const handleCancel = () => {
          console.log("Custom modal cancel.");
          closeCustomModal();
        };
        const closeCustomModal = () => {
          customTagModal.style.display = "none";
          confirmCustomTagBtn.removeEventListener("click", handleConfirm);
          cancelCustomTagBtn.removeEventListener("click", handleCancel);
          customTagInput.removeEventListener("keypress", handleKeyPress);
        };
        const handleKeyPress = (event) => {
          if (event.key === "Enter") {
            handleConfirm();
          }
        };
        confirmCustomTagBtn.addEventListener("click", handleConfirm, { once: true });
        cancelCustomTagBtn.addEventListener("click", handleCancel, { once: true });
        customTagInput.addEventListener("keypress", handleKeyPress);
      }, true);
      buttonsDiv.appendChild(addTagButton);
    }
  }
  let regionTags;
  if (effectiveApiTypeForSecondaryTags === "tv") {
    regionTags = ["全部", "国产剧", "美剧", "英剧", "韩剧", "日剧", "港剧", "内地", "欧美", "华语", "台湾", "日本", "韩国", "英国", "美国", "中国大陆"];
  } else {
    regionTags = ["全部", "中国大陆", "美国", "香港", "台湾", "日本", "韩国", "英国", "法国", "德国", "意大利", "西班牙", "印度", "泰国", "俄罗斯", "加拿大", "澳大利亚", "爱尔兰", "瑞典", "巴西", "丹麦", "内地", "欧美", "华语"];
  }
  const sortOptionsOldApi = [
    { name: "综合排序", value: "recommend" },
    { name: "按时间排序", value: "time" },
    { name: "按评价排序", value: "rank" }
    // { name: '按排行榜', value: 'chart_top_list' } // Removed as per request
  ];
  createOldApiButtonGroup("排序方式", sortOptionsOldApi, window.currentOldApiFilters.sort, "sort", false);
}
function updateAllButtonActiveStates() {
  const useOnlyOldApi = localStorage.getItem("doubanApiMode") === "false";
  if (useOnlyOldApi) {
    return;
  }
  window.allButtonGroups.forEach((group) => {
    const paramName = group.key;
    group.element.querySelectorAll("button").forEach((btn) => {
      const btnValue = btn.dataset.filterValue;
      const btnName = btn.textContent;
      let isActive = false;
      if (paramName === "sort") {
        isActive = btnValue === window.currentSearchPageFilters.sort;
      } else if (paramName === "tags") {
        if (btnName === "全部") isActive = window.currentSearchPageFilters.tags === "";
        else isActive = btnValue === window.currentSearchPageFilters.tags;
      } else {
        isActive = btnValue === window.currentSearchPageFilters[paramName] || btnName === "全部" && !window.currentSearchPageFilters[paramName];
      }
      btn.className = "px-3 py-1.5 text-sm font-medium rounded-md border transition-colors duration-200 ".concat(isActive ? "bg-pink-600 text-white border-pink-500" : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white");
    });
  });
}
async function applySearchPageFilters(isLoadingMore = false) {
  const useOnlyOldApi = localStorage.getItem("doubanApiMode") === "false";
  if (useOnlyOldApi) {
    await applyOldApiFilters(isLoadingMore);
    return;
  }
  const resultsDiv = document.getElementById("douban-filter-items-grid");
  const countEl = document.getElementById("doubanFilterResultsCount");
  const loadingEl = document.getElementById("loading");
  if (!resultsDiv || !countEl) {
    console.error("Filter page result elements ('douban-filter-items-grid', 'doubanFilterResultsCount') not found.");
    if (loadingEl) loadingEl.style.display = "none";
    window.isLoadingSearchPageFilters = false;
    return;
  }
  if (!isLoadingMore) {
    window.currentSearchPageFilters.start = 0;
    window.noMoreSearchPageFilterItems = false;
    resultsDiv.innerHTML = '<p class="col-span-full text-center text-gray-400 py-8">正在加载筛选结果...</p>';
    if (countEl) countEl.textContent = "0";
  } else if (window.isLoadingSearchPageFilters || window.noMoreSearchPageFilterItems) {
    return;
  }
  window.isLoadingSearchPageFilters = true;
  if (loadingEl) loadingEl.style.display = "flex";
  const paramsToFetch = {
    tags: window.currentSearchPageFilters.tags || "",
    genres: window.currentSearchPageFilters.genres || "",
    countries: window.currentSearchPageFilters.countries || "",
    sort: window.currentSearchPageFilters.sort || doubanFilterOptions.sortBy.defaultValue,
    start: window.currentSearchPageFilters.start.toString(),
    range: window.currentSearchPageFilters.range || "0,10"
  };
  console.log("Applying New API Douban Filters on Filter Page:", paramsToFetch);
  try {
    const data = await fetchNewDoubanSearch(paramsToFetch);
    if (!isLoadingMore) resultsDiv.innerHTML = "";
    if (data && data.subjects && data.subjects.length > 0) {
      if (typeof renderDoubanSearchResultsGrid === "function") {
        renderDoubanSearchResultsGrid(data, resultsDiv);
      } else {
        console.error("renderDoubanSearchResultsGrid function not found");
        resultsDiv.innerHTML += '<p class="col-span-full text-red-500">UI渲染错误</p>';
      }
      window.currentSearchPageFilters.start = parseInt(window.currentSearchPageFilters.start, 10) + data.subjects.length;
      if (countEl) countEl.textContent = isLoadingMore ? parseInt(countEl.textContent || "0") + data.subjects.length : data.subjects.length;
      if (data.subjects.length < window.DOUBAN_FILTER_ITEMS_PER_PAGE) {
        window.noMoreSearchPageFilterItems = true;
      }
    } else {
      if (!isLoadingMore) resultsDiv.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">没有找到符合条件的内容。</p>';
      if (countEl && !isLoadingMore) countEl.textContent = "0";
      window.noMoreSearchPageFilterItems = true;
    }
  } catch (error) {
    console.error("Error applying New API Douban filters:", error);
    if (!isLoadingMore) resultsDiv.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">加载筛选结果失败。</p>';
  } finally {
    window.isLoadingSearchPageFilters = false;
    if (loadingEl) loadingEl.style.display = "none";
  }
}
async function applyOldApiFilters(isLoadingMore = false) {
  const resultsDiv = document.getElementById("douban-filter-items-grid");
  const countEl = document.getElementById("doubanFilterResultsCount");
  const loadingEl = document.getElementById("loading");
  if (!resultsDiv || !countEl) {
    console.error("Filter page result elements for old API not found.");
    if (loadingEl) loadingEl.style.display = "none";
    window.isLoadingSearchPageFilters = false;
    return;
  }
  if (!isLoadingMore) {
    window.currentOldApiFilters.start = 0;
    window.noMoreSearchPageFilterItems = false;
    resultsDiv.innerHTML = '<p class="col-span-full text-center text-gray-400 py-8">正在使用旧版API加载筛选结果...</p>';
    if (countEl) countEl.textContent = "0";
  } else if (window.isLoadingSearchPageFilters || window.noMoreSearchPageFilterItems) {
    return;
  }
  window.isLoadingSearchPageFilters = true;
  if (loadingEl) loadingEl.style.display = "flex";
  let finalApiType = window.currentOldApiFilters.apiType;
  let finalApiTag = window.currentOldApiFilters.apiTag;
  if (window.currentOldApiFilters.selectedTheme && window.currentOldApiFilters.selectedTheme !== "全部") {
    finalApiTag = window.currentOldApiFilters.selectedTheme;
  }
  const { sort, start } = window.currentOldApiFilters;
  const itemsPerPage = 20;
  console.log("[Debug Old API Filter] Selections before URL:", JSON.stringify(window.currentOldApiFilters));
  const effectiveSort = sort;
  console.log("[Debug Old API Filter] Derived apiType: ".concat(finalApiType, ", Derived apiTag for URL: ").concat(finalApiTag, ", Sort: ").concat(effectiveSort));
  const oldApiUrl = "https://movie.douban.com/j/search_subjects?type=".concat(finalApiType, "&tag=").concat(encodeURIComponent(finalApiTag), "&sort=").concat(effectiveSort, "&page_limit=").concat(itemsPerPage, "&page_start=").concat(start);
  console.log("Applying Old API Douban Filters on Filter Page (Search Subjects):", oldApiUrl);
  const dataPromise = fetchDoubanData(oldApiUrl);
  try {
    const data = await dataPromise;
    if (!isLoadingMore) resultsDiv.innerHTML = "";
    if (data && data.subjects && data.subjects.length > 0) {
      if (typeof renderDoubanSearchResultsGrid === "function") {
        renderDoubanSearchResultsGrid(data, resultsDiv);
      } else {
        console.error("renderDoubanSearchResultsGrid function not found");
        resultsDiv.innerHTML += '<p class="col-span-full text-red-500">UI渲染错误</p>';
      }
      window.currentOldApiFilters.start += data.subjects.length;
      if (countEl) countEl.textContent = isLoadingMore ? parseInt(countEl.textContent || "0") + data.subjects.length : data.subjects.length;
      if (data.subjects.length < itemsPerPage) {
        window.noMoreSearchPageFilterItems = true;
      }
    } else {
      if (!isLoadingMore) resultsDiv.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">没有找到符合条件的内容。</p>';
      if (countEl && !isLoadingMore) countEl.textContent = "0";
      window.noMoreSearchPageFilterItems = true;
    }
  } catch (error) {
    console.error("Error applying Old API Douban filters (or Chart API):", error);
    if (!isLoadingMore) resultsDiv.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">加载筛选结果失败。</p>';
  } finally {
    window.isLoadingSearchPageFilters = false;
    if (loadingEl) loadingEl.style.display = "none";
  }
}
function handleSearchPageScroll() {
  if (window.isLoadingSearchPageFilters || window.noMoreSearchPageFilterItems) {
    return;
  }
  const filterPage = document.getElementById("page-filter");
  if (!filterPage || filterPage.classList.contains("hidden")) {
    return;
  }
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    console.log("Infinite scroll triggered for Filter Page.");
    applySearchPageFilters(true);
  }
}
