console.log("douban_logic.js loaded");
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
async function fetchAndCacheDoubanData(cacheKey, fetchFn, ...fetchArgs) {
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log("豆瓣首页：从缓存加载", cacheKey);
      return JSON.parse(cachedData);
    }
  } catch (e) {
    console.error("豆瓣首页：读取缓存失败", cacheKey, e);
    sessionStorage.removeItem(cacheKey);
  }
  const data = await fetchFn(...fetchArgs);
  if (data && data.subjects) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      console.log("豆瓣首页：已缓存", cacheKey);
    } catch (e) {
      console.error("豆瓣首页：写入缓存失败", cacheKey, e);
    }
  }
  return data;
}
window.defaultMovieTags = ["热门", "最新", "经典", "豆瓣高分", "冷门佳片", "华语", "欧美", "韩国", "日本", "动作", "喜剧", "爱情", "科幻", "悬疑", "恐怖", "治愈"];
window.defaultTvTags = ["热门", "美剧", "英剧", "韩剧", "日剧", "国产剧", "港剧", "日本动画", "综艺", "纪录片"];
window.movieTags = [];
window.tvTags = [];
const movieChartNames = {
  "Top250电影": { tag: "豆瓣高分", sort: "rank" },
  "正在热映": { tag: "热门", sort: "recommend" },
  "即将上映": { tag: "最新", sort: "time" },
  "新片榜": { tag: "最新", sort: "recommend" },
  "口碑榜": { tag: "豆瓣高分", sort: "recommend" },
  "近期高分电影": { tag: "豆瓣高分", sort: "time" },
  "经典动作大片": { tag: "动作", sort: "rank" },
  "热门科幻电影": { tag: "科幻", sort: "recommend" },
  "冷门佳片精选": { tag: "冷门佳片", sort: "rank" },
  "最新华语电影": { tag: "华语", sort: "time" }
};
const tvChartNames = {
  "热门剧集综合榜": { tag: "热门", sort: "rank" },
  "高分热门美剧": { tag: "美剧", sort: "rank" },
  "近期日剧新作": { tag: "日剧", sort: "time" },
  "经典纪录片": { tag: "纪录片", sort: "rank" },
  "国产剧集精选": { tag: "国产剧", sort: "recommend" },
  "高分日本动画": { tag: "日本动画", sort: "rank" }
};
window.doubanMovieTvCurrentSwitch = "movie";
window.doubanCurrentTag = "热门";
window.homepageTopNavTags = [];
window.currentCategoryViewTag = "";
window.currentCategoryViewType = "";
window.currentCategoryPageStart = 0;
window.categoryItemsPerPage = 20;
window.isLoadingCategoryItems = false;
window.noMoreCategoryItems = false;
window.currentCategorySourceConfig = null;
window.homePageActiveTags = [];
window.homePageCurrentTagIndex = 0;
window.homePageItemsPerTag = 20;
window.homePageTagsPerBatch = 2;
window.isLoadingHomePageItems = false;
window.noMoreHomePageTags = false;
function loadUserTags() {
  try {
    const savedMovieTags = localStorage.getItem("userMovieTags");
    window.movieTags = savedMovieTags ? JSON.parse(savedMovieTags) : [...window.defaultMovieTags];
    const savedTvTags = localStorage.getItem("userTvTags");
    window.tvTags = savedTvTags ? JSON.parse(savedTvTags) : [...window.defaultTvTags];
  } catch (e) {
    console.error("加载标签失败：", e);
    window.movieTags = [...window.defaultMovieTags];
    window.tvTags = [...window.defaultTvTags];
  }
}
function saveUserTags() {
  try {
    localStorage.setItem("userMovieTags", JSON.stringify(window.movieTags));
    localStorage.setItem("userTvTags", JSON.stringify(window.tvTags));
  } catch (e) {
    console.error("保存标签失败：", e);
    if (typeof showToast === "function") showToast("保存标签失败", "error");
  }
}
async function loadNextBatchOfHomePageTags() {
  const homePage = document.getElementById("page-home");
  if (!homePage || homePage.classList.contains("hidden")) {
    window.isLoadingHomePageItems = false;
    return;
  }
  if (window.isLoadingHomePageItems || window.noMoreHomePageTags) return;
  window.isLoadingHomePageItems = true;
  const recommendationsContainer = document.getElementById("douban-recommendations-container");
  if (!recommendationsContainer) {
    window.isLoadingHomePageItems = false;
    return;
  }
  let bottomSpinner = document.getElementById("home-page-bottom-spinner");
  if (window.homePageCurrentTagIndex > 0 && !window.noMoreHomePageTags) {
    if (!bottomSpinner) {
      bottomSpinner = document.createElement("div");
      bottomSpinner.id = "home-page-bottom-spinner";
      bottomSpinner.className = "col-span-full text-center py-4";
      recommendationsContainer.appendChild(bottomSpinner);
    }
    bottomSpinner.innerHTML = '<p class="text-gray-400">正在加载更多推荐...</p>';
    bottomSpinner.style.display = "block";
  }
  for (let i = 0; i < window.homePageTagsPerBatch; i++) {
    if (window.homePageCurrentTagIndex >= window.homePageActiveTags.length) {
      window.noMoreHomePageTags = true;
      break;
    }
    const tagConfig = window.homePageActiveTags[window.homePageCurrentTagIndex];
    window.homePageCurrentTagIndex++;
    const section = document.createElement("div");
    section.className = "home-tag-section py-4";
    const titleContainer = document.createElement("div");
    titleContainer.className = "flex justify-between items-center px-1 mb-3";
    const titleElement = document.createElement("h2");
    titleElement.className = "text-xl font-semibold text-white";
    titleElement.textContent = tagConfig.title;
    titleContainer.appendChild(titleElement);
    if (!tagConfig.isChart || tagConfig.isChart && tagConfig.typeForCatView) {
      const moreButton = document.createElement("button");
      moreButton.className = "text-sm text-pink-400 hover:text-pink-300 transition-colors";
      moreButton.innerHTML = "更多 &rarr;";
      moreButton.onclick = () => {
        const categoryTypeForView = tagConfig.isChart ? tagConfig.typeForCatView : tagConfig.typeForCatView || tagConfig.type;
        navigateToCategoryView(tagConfig.title, categoryTypeForView, tagConfig);
      };
      titleContainer.appendChild(moreButton);
    }
    section.appendChild(titleContainer);
    const carouselContainer = document.createElement("div");
    carouselContainer.className = "carousel-container overflow-x-auto pb-2";
    const carouselTrack = document.createElement("div");
    carouselTrack.className = "carousel-track flex space-x-3";
    carouselContainer.appendChild(carouselTrack);
    section.appendChild(carouselContainer);
    if (bottomSpinner && recommendationsContainer.contains(bottomSpinner)) {
      recommendationsContainer.insertBefore(section, bottomSpinner);
    } else {
      recommendationsContainer.appendChild(section);
    }
    carouselTrack.innerHTML = `<div class="text-gray-400 p-4">正在加载 ${tagConfig.title}...</div>`;
    let data;
    const useOnlyOldApi = localStorage.getItem("doubanApiMode") !== "true";
    let cacheKeyPrefix = `doubanCache_home_${tagConfig.title.replace(/[^a-zA-Z0-9]/g, "")}_`;
    if (tagConfig.isChart) {
      console.log(`[Home Page Waterfall] Preparing chart for "${tagConfig.title}" (Genre: ${tagConfig.chartGenreName})`);
      const chartCacheKey = `${cacheKeyPrefix}chart_${tagConfig.chartGenreName}_${window.homePageItemsPerTag}`;
      data = await fetchAndCacheDoubanData(chartCacheKey, fetchDoubanChartTopList, tagConfig.chartGenreName, { limit: window.homePageItemsPerTag });
    } else if (!useOnlyOldApi && tagConfig.useNewApi && tagConfig.apiParams) {
      const paramsForFetch = { ...tagConfig.apiParams, start: "0" };
      const paramsString = JSON.stringify(paramsForFetch, Object.keys(paramsForFetch).sort());
      const newApiCacheKey = `${cacheKeyPrefix}new_${paramsString.replace(/[^a-zA-Z0-9]/g, "")}`;
      console.log(`[Home Page Waterfall] Preparing New API fetch for "${tagConfig.title}"`);
      data = await fetchAndCacheDoubanData(newApiCacheKey, fetchNewDoubanSearch, paramsForFetch);
    } else {
      const doubanApiBase = "https://movie.douban.com";
      let oldApiType = tagConfig.type;
      let oldApiTag = tagConfig.apiTag;
      let oldApiSort = tagConfig.apiSort;
      if (useOnlyOldApi && tagConfig.useNewApi && tagConfig.apiParams) {
        let determinedType = "movie";
        const typeHint = tagConfig.typeForCatView || (tagConfig.apiParams ? tagConfig.apiParams.tags : "");
        if (typeHint === "电影") determinedType = "movie";
        else if (typeHint === "电视剧") determinedType = "tv";
        else if (typeHint === "动画") determinedType = "movie";
        else if (typeHint === "综艺") determinedType = "tv";
        else if (typeHint === "纪录片") determinedType = "movie";
        else if (typeHint === "短片") determinedType = "movie";
        oldApiType = determinedType;
        if (tagConfig.apiParams.genres) oldApiTag = tagConfig.apiParams.genres;
        else if (tagConfig.apiParams.countries) oldApiTag = tagConfig.apiParams.countries;
        else if (tagConfig.apiParams.tags) oldApiTag = tagConfig.apiParams.tags;
        else oldApiTag = tagConfig.title;
        const sortMap = { "T": "recommend", "R": "time", "S": "rank" };
        const newApiSortParam = tagConfig.apiParams.sort || tagConfig.apiSort;
        oldApiSort = sortMap[newApiSortParam] || (["recommend", "time", "rank"].includes(newApiSortParam) ? newApiSortParam : "recommend");
      }
      const targetUrl = `${doubanApiBase}/j/search_subjects?type=${oldApiType}&tag=${encodeURIComponent(oldApiTag)}&sort=${oldApiSort}&page_limit=${window.homePageItemsPerTag}&page_start=0`;
      const oldApiCacheKey = `${cacheKeyPrefix}old_${encodeURIComponent(targetUrl)}`;
      console.log(`[Home Page Waterfall] (${useOnlyOldApi ? "Old API Mode Fallback" : "Old API Config"}) Preparing Old API fetch for section "${tagConfig.title}" (tag: ${oldApiTag}, type: ${oldApiType}, sort: ${oldApiSort})`);
      data = await fetchAndCacheDoubanData(oldApiCacheKey, fetchDoubanData, targetUrl);
    }
    try {
      if (data && data.subjects && data.subjects.length > 0) {
        if (typeof renderDoubanCardsAsCarousel === "function") {
          renderDoubanCardsAsCarousel(data, carouselTrack, tagConfig.type, tagConfig.apiTag);
        } else {
          console.error("renderDoubanCardsAsCarousel function not found");
          carouselTrack.innerHTML = `<div class="text-red-400 p-4">UI Error</div>`;
        }
      } else {
        carouselTrack.innerHTML = `<div class="text-gray-400 p-4">${tagConfig.title}: 暂无内容</div>`;
      }
    } catch (error) {
      console.error(`处理豆瓣首页数据失败 (Title: ${tagConfig.title}):`, error);
      carouselTrack.innerHTML = `<div class="text-red-400 p-4">❌ 加载 ${tagConfig.title} 失败</div>`;
    }
  }
  if (bottomSpinner) {
    if (window.noMoreHomePageTags) {
      bottomSpinner.innerHTML = '<p class="text-gray-500">已加载全部推荐内容</p>';
    } else {
      bottomSpinner.style.display = "none";
    }
  }
  if (window.noMoreHomePageTags && !bottomSpinner && recommendationsContainer.querySelector(".home-tag-section")) {
    if (!recommendationsContainer.querySelector(".all-loaded-message")) {
      const endMsg = document.createElement("p");
      endMsg.className = "text-center text-gray-500 py-8 col-span-full all-loaded-message";
      endMsg.textContent = "已加载全部推荐内容";
      recommendationsContainer.appendChild(endMsg);
    }
  }
  window.isLoadingHomePageItems = false;
  setTimeout(() => {
    const isScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
    if (!isScrollable && !window.noMoreHomePageTags && !window.isLoadingHomePageItems) {
      console.log("Content is not scrollable, loading next batch of home page tags...");
      loadNextBatchOfHomePageTags();
    }
  }, 100);
}
function initHomePageDoubanContent() {
  const recommendationsContainer = document.getElementById("douban-recommendations-container");
  if (!recommendationsContainer) return;
  recommendationsContainer.innerHTML = "";
  if (localStorage.getItem("doubanEnabled") !== "true") {
    recommendationsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">豆瓣推荐已关闭。请在设置中开启。</p>';
    return;
  }
  window.homePageActiveTags = [];
  const currentMovieOrTvType = window.doubanMovieTvCurrentSwitch === "movie" ? "电影" : "电视剧";
  const newApiSortMap = { "热度": "T", "时间": "R", "评分": "S" };
  const extraContentTypes = [
    // For New API: 'tags' can be '综艺', '动画', '纪录片', '短片'.
    // For Old API fallback: typeForCatView helps determine 'movie' or 'tv'.
    // '综艺' is typically TV.
    { title: "热门综艺", typeForCatView: "综艺", apiParams: { tags: "综艺", sort: newApiSortMap["热度"] } },
    // '动画' can be movie or TV series.
    { title: "热门动画电影", typeForCatView: "动画", apiParams: {
      tags: "动画",
      genres: "动画",
      /*could add &movie_type=feature if new API supports*/
      sort: newApiSortMap["热度"]
    } },
    // Assuming '动画' tag implies movies for New API, or typeForCatView maps to movie for old.
    { title: "热门动画剧集", typeForCatView: "电视剧", apiParams: {
      tags: "动画",
      /* genres: '动画', */
      sort: newApiSortMap["热度"]
    } },
    // Changed: Use tags: '动画' primarily. If new API returns mixed, client-side filtering might be needed if type field exists in items. Old API fallback uses '日本动画' for TV.
    // '纪录片' can be movie or TV series.
    { title: "高分纪录片电影", typeForCatView: "纪录片", apiParams: { tags: "纪录片", genres: "纪录片", sort: newApiSortMap["评分"] } },
    { title: "高分纪录片剧集", typeForCatView: "电视剧", apiParams: { tags: "电视剧", genres: "纪录片", sort: newApiSortMap["评分"] } },
    // '短片' is typically movie.
    { title: "精选短片", typeForCatView: "短片", apiParams: { tags: "短片", sort: newApiSortMap["评分"] } }
  ];
  extraContentTypes.forEach((ct) => {
    let oldApiFallbackTag = ct.apiParams.genres || ct.apiParams.tags || ct.title;
    if (ct.title === "热门动画剧集") {
      oldApiFallbackTag = "日本动画";
    }
    homePageActiveTags.push({
      title: ct.title,
      apiParams: { ...ct.apiParams, range: `0,${window.homePageItemsPerTag}`, start: "0" },
      useNewApi: ct.title === "热门动画剧集" ? false : true,
      // Force Old API for "热门动画剧集" on homepage
      type: ct.typeForCatView,
      apiTag: oldApiFallbackTag,
      // This apiTag is used for the old API fallback
      apiSort: ct.apiParams.sort
    });
  });
  const genreSections = [
    { title: `科幻${currentMovieOrTvType}`, typeForCatView: currentMovieOrTvType, apiParams: { tags: currentMovieOrTvType, genres: "科幻", sort: newApiSortMap["评分"] } },
    { title: `喜剧${currentMovieOrTvType}`, typeForCatView: currentMovieOrTvType, apiParams: { tags: currentMovieOrTvType, genres: "喜剧", sort: newApiSortMap["评分"] } },
    { title: `动作${currentMovieOrTvType}`, typeForCatView: currentMovieOrTvType, apiParams: { tags: currentMovieOrTvType, genres: "动作", sort: newApiSortMap["热度"] } },
    { title: "美国科幻电影", typeForCatView: "电影", apiParams: { tags: "电影", genres: "科幻", countries: "美国", sort: newApiSortMap["评分"] } }
  ];
  genreSections.forEach((gs) => {
    homePageActiveTags.push({
      title: gs.title,
      apiParams: { ...gs.apiParams, range: `0,${window.homePageItemsPerTag}`, start: "0" },
      // New API uses range
      useNewApi: true,
      type: gs.typeForCatView,
      apiTag: gs.apiParams.genres || gs.apiParams.countries || gs.title,
      apiSort: gs.apiParams.sort
    });
  });
  const charts = window.doubanMovieTvCurrentSwitch === "movie" ? movieChartNames : tvChartNames;
  Object.keys(charts).forEach((chartName) => {
    if (!window.homePageActiveTags.some((tag) => tag.title === chartName)) {
      window.homePageActiveTags.push({
        title: chartName,
        apiTag: charts[chartName].tag,
        // Used by old API path
        apiSort: charts[chartName].sort,
        // Used by old API path
        type: window.doubanMovieTvCurrentSwitch,
        // Used by old API path
        useNewApi: false
        // Explicitly use old API structure
      });
    }
  });
  const currentBaseTags = window.doubanMovieTvCurrentSwitch === "movie" ? window.movieTags : window.tvTags;
  currentBaseTags.forEach((tag) => {
    if (!window.homePageActiveTags.some((t) => t.title === tag || t.apiTag === tag && t.type === window.doubanMovieTvCurrentSwitch && !t.useNewApi)) {
      window.homePageActiveTags.push({
        title: tag,
        apiTag: tag,
        apiSort: "recommend",
        type: window.doubanMovieTvCurrentSwitch,
        useNewApi: false
      });
    }
  });
  window.homePageActiveTags.push({ title: "热门推荐", apiTag: "热门", apiSort: "recommend", type: window.doubanMovieTvCurrentSwitch, useNewApi: false });
  window.homePageActiveTags.push({ title: "热门推荐", apiTag: "热门", apiSort: "recommend", type: window.doubanMovieTvCurrentSwitch, useNewApi: false });
  window.homePageActiveTags.push({ title: "最新上线", apiTag: "最新", apiSort: "time", type: window.doubanMovieTvCurrentSwitch, useNewApi: false });
  function getTagSourceKey(tagInfo) {
    if (tagInfo.isChart && tagInfo.chartGenreName) {
      return `chart_${tagInfo.chartGenreName}`;
    } else if (tagInfo.useNewApi && tagInfo.apiParams) {
      const sortedParams = {};
      Object.keys(tagInfo.apiParams).sort().forEach((key) => {
        if (key !== "range" && key !== "start") {
          sortedParams[key] = tagInfo.apiParams[key];
        }
      });
      return `new_${JSON.stringify(sortedParams)}`;
    } else if (!tagInfo.useNewApi && tagInfo.apiTag && tagInfo.apiSort && tagInfo.type) {
      return `old_${tagInfo.type}_${tagInfo.apiTag}_${tagInfo.apiSort}`;
    }
    console.warn("[Douban Home] Tag missing key properties for source identification:", tagInfo.title, tagInfo);
    return `title_${tagInfo.title}`;
  }
  const finalHomePageActiveTags = [];
  const seenSourceKeys = /* @__PURE__ */ new Map();
  for (const tagInfo of window.homePageActiveTags) {
    const sourceKey = getTagSourceKey(tagInfo);
    if (!seenSourceKeys.has(sourceKey)) {
      finalHomePageActiveTags.push(tagInfo);
      seenSourceKeys.set(sourceKey, { index: finalHomePageActiveTags.length - 1, title: tagInfo.title, useNewApi: tagInfo.useNewApi });
      console.log(`[Douban Home Dedupe] Adding: "${tagInfo.title}" (Key: ${sourceKey})`);
    } else {
      const existingEntry = seenSourceKeys.get(sourceKey);
      const existingTag = finalHomePageActiveTags[existingEntry.index];
      console.log(`[Douban Home Dedupe] Duplicate sourceKey "${sourceKey}" for new tag "${tagInfo.title}". Existing: "${existingTag.title}".`);
      if (tagInfo.useNewApi && !existingTag.useNewApi) {
        console.log(`[Douban Home Dedupe] Replacing "${existingTag.title}" with "${tagInfo.title}" (New API preferred).`);
        finalHomePageActiveTags[existingEntry.index] = tagInfo;
        seenSourceKeys.set(sourceKey, { index: existingEntry.index, title: tagInfo.title, useNewApi: tagInfo.useNewApi });
      } else if (!tagInfo.useNewApi && existingTag.useNewApi) {
        console.log(`[Douban Home Dedupe] Keeping "${existingTag.title}" (New API preferred over "${tagInfo.title}").`);
      } else {
        if (tagInfo.title === "热门推荐" && existingTag.title !== "热门推荐") {
          console.log(`[Douban Home Dedupe] Skipping generic "热门推荐" as "${existingTag.title}" already covers key "${sourceKey}".`);
        } else if (existingTag.title === "热门推荐" && tagInfo.title !== "热门推荐") {
          console.log(`[Douban Home Dedupe] Replacing generic "${existingTag.title}" with more specific "${tagInfo.title}" for key "${sourceKey}".`);
          finalHomePageActiveTags[existingEntry.index] = tagInfo;
          seenSourceKeys.set(sourceKey, { index: existingEntry.index, title: tagInfo.title, useNewApi: tagInfo.useNewApi });
        } else {
          console.log(`[Douban Home Dedupe] Keeping existing "${existingTag.title}" over "${tagInfo.title}" for key "${sourceKey}" (same API type, no strong preference or first one encountered).`);
        }
      }
    }
  }
  window.homePageActiveTags = finalHomePageActiveTags;
  console.log("[Douban Home] Final unique active tags count:", window.homePageActiveTags.length);
  window.homePageActiveTags.forEach((tag) => console.log(`  - ${tag.title} (useNewApi: ${tag.useNewApi}, isChart: ${!!tag.isChart}, Key: ${getTagSourceKey(tag)})`));
  const RUSTYTV_SHUFFLED_TAG_ORDER_KEY = "rustyTvShuffledHomePageTagOrder";
  try {
    const storedOrderJson = sessionStorage.getItem(RUSTYTV_SHUFFLED_TAG_ORDER_KEY);
    if (storedOrderJson && window.homePageActiveTags.length > 0) {
      const storedTitles = JSON.parse(storedOrderJson);
      const currentTagsMap = new Map(window.homePageActiveTags.map((tag) => [tag.title, tag]));
      const reorderedTags = [];
      const presentTagsFromStoredOrder = /* @__PURE__ */ new Set();
      for (const title of storedTitles) {
        if (currentTagsMap.has(title)) {
          const tag = currentTagsMap.get(title);
          reorderedTags.push(tag);
          presentTagsFromStoredOrder.add(tag.title);
        }
      }
      for (const tag of window.homePageActiveTags) {
        if (!presentTagsFromStoredOrder.has(tag.title)) {
          reorderedTags.push(tag);
        }
      }
      window.homePageActiveTags = reorderedTags;
      console.log("[Douban Home] Applied stored tag order.");
    } else if (window.homePageActiveTags.length > 0) {
      shuffleArray(window.homePageActiveTags);
      const titlesToStore = window.homePageActiveTags.map((tag) => tag.title);
      sessionStorage.setItem(RUSTYTV_SHUFFLED_TAG_ORDER_KEY, JSON.stringify(titlesToStore));
      console.log("[Douban Home] Shuffled tags and stored order for this session.");
    }
  } catch (e) {
    console.error("[Douban Home] Error handling shuffled tag order:", e);
    if (window.homePageActiveTags.length > 0) {
      shuffleArray(window.homePageActiveTags);
      console.warn("[Douban Home] Shuffled tags due to error in stored order processing; new order not saved for this session.");
    }
  }
  window.homePageCurrentTagIndex = 0;
  window.noMoreHomePageTags = false;
  window.isLoadingHomePageItems = false;
  let existingBottomSpinner = document.getElementById("home-page-bottom-spinner");
  if (existingBottomSpinner) existingBottomSpinner.remove();
  let existingAllLoadedMessage = recommendationsContainer.querySelector(".all-loaded-message");
  if (existingAllLoadedMessage) existingAllLoadedMessage.remove();
  if (window.homePageActiveTags.length === 0) {
    recommendationsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">暂无可推荐的豆瓣内容分类。</p>';
    return;
  }
  loadNextBatchOfHomePageTags();
}
function initDouban(options = {}) {
  var _a;
  console.log("[DoubanInit] Initializing Douban with options:", options);
  const initialState = options.initialState || null;
  const isFirstLoadOrForceMain = !sessionStorage.getItem("doubanState") && !initialState || options.forceMainView;
  if (initialState && !options.forceMainView) {
    window.doubanMovieTvCurrentSwitch = initialState.doubanType || "movie";
    window.doubanCurrentTag = initialState.selectedTag || "热门";
  } else {
    const storedDoubanStateStr = sessionStorage.getItem("doubanState");
    if (storedDoubanStateStr && !options.forceMainView) {
      try {
        const storedState = JSON.parse(storedDoubanStateStr);
        window.doubanMovieTvCurrentSwitch = storedState.doubanType || "movie";
        window.doubanCurrentTag = storedState.selectedTag || "热门";
      } catch (e) {
        window.doubanMovieTvCurrentSwitch = "movie";
        window.doubanCurrentTag = isFirstLoadOrForceMain ? "__HOME__" : "热门";
      }
    } else {
      window.doubanMovieTvCurrentSwitch = "movie";
      window.doubanCurrentTag = isFirstLoadOrForceMain ? "__HOME__" : "热门";
    }
  }
  const doubanToggle = document.getElementById("doubanToggle");
  if (doubanToggle) {
    const isEnabled = localStorage.getItem("doubanEnabled") === "true";
    doubanToggle.checked = isEnabled;
    const toggleBg = doubanToggle.nextElementSibling;
    const toggleDot = toggleBg ? toggleBg.nextElementSibling : null;
    if (toggleBg && toggleDot) {
      if (isEnabled) {
        toggleBg.classList.add("bg-pink-600");
        toggleDot.classList.add("translate-x-6");
      } else {
        toggleBg.classList.remove("bg-pink-600");
        toggleDot.classList.remove("translate-x-6");
      }
      doubanToggle.addEventListener("change", function(e) {
        const isChecked = e.target.checked;
        localStorage.setItem("doubanEnabled", isChecked);
        if (isChecked) {
          toggleBg.classList.add("bg-pink-600");
          toggleDot.classList.add("translate-x-6");
        } else {
          toggleBg.classList.remove("bg-pink-600");
          toggleDot.classList.remove("translate-x-6");
        }
        sessionStorage.removeItem("homePageState");
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("douban_api_cache_")) {
            sessionStorage.removeItem(key);
            i--;
          }
        }
        initHomePageDoubanContent();
      });
    }
  }
  loadUserTags();
  const newApiSortMap = { "热度": "T", "时间": "R", "评分": "S" };
  const contentTypesForTags = ["电影", "电视剧", "综艺", "动画", "纪录片", "短片"];
  const commonGenres = ["喜剧", "爱情", "动作", "科幻", "悬疑", "犯罪", "惊悚", "恐怖"];
  const commonCountries = ["中国大陆", "美国", "香港", "日本", "韩国", "英国", "法国"];
  window.homepageTopNavTags = [];
  contentTypesForTags.forEach((ct) => {
    window.homepageTopNavTags.push({ title: ct, typeForCatView: ct, useNewApi: true, apiParams: { tags: ct, sort: newApiSortMap["评分"] } });
  });
  contentTypesForTags.forEach((ct) => {
    if (["综艺", "纪录片", "短片"].includes(ct)) return;
    commonGenres.forEach((genre) => {
      if (ct === "动画" && genre === "动画") return;
      window.homepageTopNavTags.push({ title: `${genre}${ct}`, typeForCatView: ct, useNewApi: true, apiParams: { tags: ct, genres: genre, sort: newApiSortMap["热度"] } });
    });
  });
  contentTypesForTags.forEach((ct) => {
    if (["综艺", "纪录片", "短片"].includes(ct)) return;
    commonCountries.forEach((country) => {
      window.homepageTopNavTags.push({ title: `${country}${ct}`, typeForCatView: ct, useNewApi: true, apiParams: { tags: ct, countries: country, sort: newApiSortMap["热度"] } });
    });
  });
  window.homepageTopNavTags.push({ title: "豆瓣高分电影", typeForCatView: "电影", useNewApi: true, apiParams: { tags: "电影", sort: newApiSortMap["评分"] } });
  window.homepageTopNavTags.push({ title: "近期热门电影", typeForCatView: "电影", useNewApi: true, apiParams: { tags: "电影", sort: newApiSortMap["热度"] } });
  window.homepageTopNavTags.push({ title: "最新电影", typeForCatView: "电影", useNewApi: true, apiParams: { tags: "电影", sort: newApiSortMap["时间"] } });
  window.homepageTopNavTags.push({ title: "热门美剧", typeForCatView: "电视剧", useNewApi: true, apiParams: { tags: "电视剧", countries: "美国", sort: newApiSortMap["热度"] } });
  window.homepageTopNavTags.push({ title: "热门日剧", typeForCatView: "电视剧", useNewApi: true, apiParams: { tags: "电视剧", countries: "日本", sort: newApiSortMap["热度"] } });
  window.homepageTopNavTags.push({ title: "高分日本动画", typeForCatView: "动画", useNewApi: true, apiParams: { tags: "动画", countries: "日本", sort: newApiSortMap["评分"] } });
  Object.keys(movieChartNames).forEach((chartName) => {
    window.homepageTopNavTags.push({
      title: chartName,
      typeForCatView: "movie",
      useNewApi: false,
      apiTag: movieChartNames[chartName].tag,
      apiSort: movieChartNames[chartName].sort
    });
  });
  Object.keys(tvChartNames).forEach((chartName) => {
    window.homepageTopNavTags.push({
      title: chartName,
      typeForCatView: "tv",
      useNewApi: false,
      apiTag: tvChartNames[chartName].tag,
      apiSort: tvChartNames[chartName].sort
    });
  });
  const generalMovieTags = ["经典", "豆瓣高分", "冷门佳片", "华语", "欧美", "韩国", "日本", "治愈"];
  generalMovieTags.forEach((tag) => {
    let apiParams = { tags: "电影", sort: newApiSortMap["热度"] };
    if (["豆瓣高分", "经典", "冷门佳片"].includes(tag)) apiParams.sort = newApiSortMap["评分"];
    if (["华语", "欧美", "韩国", "日本"].includes(tag)) {
      let countryName = tag;
      if (tag === "华语") countryName = "中国大陆";
      if (tag === "欧美") countryName = "美国";
      apiParams.countries = countryName;
    } else {
      apiParams.genres = tag;
    }
    if (!["热门", "最新", ...contentTypesForTags].includes(tag)) {
      window.homepageTopNavTags.push({ title: `${tag}电影`, typeForCatView: "电影", useNewApi: true, apiParams });
    }
  });
  const generalTvTags = ["经典", "国产剧", "港剧"];
  generalTvTags.forEach((tag) => {
    let apiParams = { tags: "电视剧", sort: newApiSortMap["热度"] };
    if (tag === "经典") apiParams.sort = newApiSortMap["评分"];
    if (tag === "国产剧") apiParams.countries = "中国大陆";
    else if (tag === "港剧") apiParams.countries = "香港";
    else apiParams.genres = tag;
    if (!["热门", "最新", ...contentTypesForTags].includes(tag)) {
      window.homepageTopNavTags.push({ title: `${tag}`, typeForCatView: "电视剧", useNewApi: true, apiParams });
    }
  });
  const uniqueHomepageNavTags = [];
  const seenNavTitles = /* @__PURE__ */ new Set();
  for (const tag of window.homepageTopNavTags) {
    if (!seenNavTitles.has(tag.title)) {
      uniqueHomepageNavTags.push(tag);
      seenNavTitles.add(tag.title);
    }
  }
  window.homepageTopNavTags = uniqueHomepageNavTags;
  if (typeof renderDoubanTags === "function") {
    renderDoubanTags(window.homepageTopNavTags, isFirstLoadOrForceMain);
  } else {
    console.error("renderDoubanTags not found in initDouban");
  }
  if (isFirstLoadOrForceMain || document.getElementById("page-home").classList.contains("hidden") || !((_a = document.getElementById("page-category-view")) == null ? void 0 : _a.classList.contains("hidden"))) {
    initHomePageDoubanContent();
  }
  let tagToSave = isFirstLoadOrForceMain ? "__HOME__" : window.doubanCurrentTag;
  sessionStorage.setItem("doubanState", JSON.stringify({ doubanType: window.doubanMovieTvCurrentSwitch, selectedTag: tagToSave }));
}
function navigateToCategoryView(categoryName, type, sourceConfig = null) {
  document.querySelectorAll(".page-content").forEach((p) => {
    if (p.id !== "page-category-view") {
      p.classList.add("hidden");
    }
  });
  const categoryViewPage = document.getElementById("page-category-view");
  if (categoryViewPage) {
    categoryViewPage.classList.remove("hidden");
  } else {
    console.error("page-category-view not found!");
    return;
  }
  document.querySelectorAll("#bottomNav .nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.page === "home") {
      item.classList.add("active");
    }
  });
  sessionStorage.setItem("activeTab", "home");
  sessionStorage.setItem("previousTab", "home");
  window.currentCategoryViewTag = categoryName;
  window.currentCategoryViewType = type;
  window.currentCategorySourceConfig = sourceConfig;
  window.currentCategoryPageStart = 0;
  window.isLoadingCategoryItems = false;
  window.noMoreCategoryItems = false;
  const titleEl = document.getElementById("category-view-title");
  if (titleEl) titleEl.textContent = categoryName.replace(/</g, "<").replace(/>/g, ">");
  const gridEl = document.getElementById("category-items-grid");
  if (gridEl) gridEl.innerHTML = "";
  loadMoreCategoryItems(true);
  window.scrollTo(0, 0);
}
async function loadMoreCategoryItems(isInitialLoad = false) {
  const categoryViewPage = document.getElementById("page-category-view");
  const sourceTagConfig = window.currentCategorySourceConfig;
  if (!categoryViewPage || categoryViewPage.classList.contains("hidden")) {
    window.isLoadingCategoryItems = false;
    return;
  }
  if (window.isLoadingCategoryItems || window.noMoreCategoryItems) return;
  window.isLoadingCategoryItems = true;
  const spinner = document.getElementById("category-loading-spinner");
  if (spinner) spinner.classList.remove("hidden");
  let url;
  let usingNewAPIForCategory = false;
  const useOnlyOldApiCategory = localStorage.getItem("doubanApiMode") !== "true";
  if (!useOnlyOldApiCategory && sourceTagConfig && sourceTagConfig.useNewApi && sourceTagConfig.apiParams) {
    const paramsForNewApi = { ...sourceTagConfig.apiParams };
    paramsForNewApi.start = window.currentCategoryPageStart.toString();
    paramsForNewApi.range = "0,10";
    usingNewAPIForCategory = true;
  } else {
    let apiTagForOld;
    if (sourceTagConfig) {
      apiTagForOld = sourceTagConfig.apiTag || sourceTagConfig.title;
    } else {
      apiTagForOld = window.currentCategoryViewTag;
    }
    let apiSortForOld = "recommend";
    let typeForOldApi = sourceTagConfig ? sourceTagConfig.typeForCatView : window.currentCategoryViewType;
    if (typeForOldApi !== "movie" && typeForOldApi !== "tv") {
      if (["动画", "短片", "纪录片"].includes(typeForOldApi)) typeForOldApi = "movie";
      else if (typeForOldApi === "综艺") typeForOldApi = "tv";
      else typeForOldApi = "movie";
    }
    if (sourceTagConfig) {
      if (sourceTagConfig.useNewApi && sourceTagConfig.apiParams && sourceTagConfig.apiParams.sort) {
        const sortMap = { "T": "recommend", "R": "time", "S": "rank" };
        apiSortForOld = sortMap[sourceTagConfig.apiParams.sort] || "recommend";
      } else if (!sourceTagConfig.useNewApi && sourceTagConfig.apiSort) {
        apiSortForOld = sourceTagConfig.apiSort;
      }
    }
    const doubanApiBase = "https://movie.douban.com";
    url = `${doubanApiBase}/j/search_subjects?type=${typeForOldApi}&tag=${encodeURIComponent(apiTagForOld)}&sort=${apiSortForOld}&page_limit=${window.categoryItemsPerPage}&page_start=${window.currentCategoryPageStart}`;
    console.log(`[CategoryView] (${useOnlyOldApiCategory ? "Old API Mode" : "Old API Config"}) Fetching: ${url}`);
  }
  try {
    let data;
    if (usingNewAPIForCategory && !useOnlyOldApiCategory) {
      const fetchParams = { ...sourceTagConfig.apiParams };
      fetchParams.start = window.currentCategoryPageStart.toString();
      fetchParams.range = "0,10";
      console.log(`[CategoryView] (New API Preferred) Fetching with params:`, fetchParams);
      data = await fetchNewDoubanSearch(fetchParams);
    } else {
      data = await fetchDoubanData(url);
    }
    if (!data || !data.subjects || !Array.isArray(data.subjects)) {
      console.error("Invalid data structure for category items:", data);
      window.noMoreCategoryItems = true;
      if (spinner) spinner.innerHTML = isInitialLoad ? '<p class="text-gray-500">此分类下暂无内容</p>' : '<p class="text-gray-500">没有更多内容了</p>';
      window.isLoadingCategoryItems = false;
      return;
    }
    if (typeof renderCategoryGridCards === "function") {
      renderCategoryGridCards(data, document.getElementById("category-items-grid"));
    } else {
      console.error("renderCategoryGridCards function not found");
    }
    if (data.subjects.length < window.categoryItemsPerPage) {
      window.noMoreCategoryItems = true;
      if (spinner) spinner.innerHTML = '<p class="text-gray-500">没有更多内容了</p>';
    } else if (data.subjects.length === 0 && isInitialLoad) {
      window.noMoreCategoryItems = true;
      if (spinner) spinner.innerHTML = '<p class="text-gray-500">此分类下暂无内容</p>';
    }
    window.currentCategoryPageStart += data.subjects.length;
  } catch (error) {
    console.error("Error loading category items:", error);
    if (spinner) spinner.innerHTML = '<p class="text-red-500">加载失败，请稍后重试</p>';
    window.noMoreCategoryItems = true;
  } finally {
    window.isLoadingCategoryItems = false;
    if (window.noMoreCategoryItems && spinner && spinner.innerHTML.includes("加载更多")) {
    } else if (!window.noMoreCategoryItems && spinner) {
      spinner.classList.add("hidden");
    }
  }
}
function handleScroll() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 300;
  if (!isNearBottom) return;
  const categoryViewPage = document.getElementById("page-category-view");
  const homePage = document.getElementById("page-home");
  const filterPage = document.getElementById("page-filter");
  if (categoryViewPage && !categoryViewPage.classList.contains("hidden")) {
    loadMoreCategoryItems(false);
  } else if (homePage && !homePage.classList.contains("hidden") && localStorage.getItem("doubanEnabled") === "true") {
    if (!window.isLoadingHomePageItems && !window.noMoreHomePageTags) {
      const recommendationsContainer = document.getElementById("douban-recommendations-container");
      if (recommendationsContainer && recommendationsContainer.offsetParent !== null) {
        loadNextBatchOfHomePageTags();
      }
    }
  } else if (filterPage && !filterPage.classList.contains("hidden")) {
    if (typeof handleSearchPageScroll === "function") {
      handleSearchPageScroll();
    }
  }
}
window.addEventListener("scroll", handleScroll, { passive: true });
document.addEventListener("scroll", handleScroll, { passive: true });
function showTagManageModal() {
  console.warn("showTagManageModal called - UI for this needs to be ensured or created.");
}
function addTag(tag) {
  console.warn("addTag called - UI for this needs to be ensured or created.");
}
function deleteTag(tag) {
  console.warn("deleteTag called - UI for this needs to be ensured or created.");
}
function resetTagsToDefault() {
  console.warn("resetTagsToDefault called - UI for this needs to be ensured or created.");
}
