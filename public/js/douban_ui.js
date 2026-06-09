console.log("douban_ui.js loaded");
function fillSearchInput(title) {
  if (!title) return;
  const safeTitle = title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = safeTitle;
    input.focus();
    showToast("已填充搜索内容，点击搜索按钮开始搜索", "info");
  }
}
function fillAndSearch(title) {
  if (!title) return;
  const safeTitle = title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = safeTitle;
    search();
  }
}
async function fillAndSearchWithDouban(title) {
  if (!title) return;
  const safeTitle = title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
  if (typeof selectedAPIs !== "undefined" && !selectedAPIs.includes("dbzy")) {
    const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
    if (doubanCheckbox) {
      doubanCheckbox.checked = true;
      if (typeof updateSelectedAPIs === "function") updateSelectedAPIs();
      else {
        selectedAPIs.push("dbzy");
        localStorage.setItem("selectedAPIs", JSON.stringify(selectedAPIs));
        const countEl = document.getElementById("selectedApiCount");
        if (countEl) countEl.textContent = selectedAPIs.length;
      }
      showToast("已自动选择豆瓣资源API", "info");
    }
  }
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = safeTitle;
    if (typeof navigateToTab === "function") navigateToTab("search");
    if (typeof activeDoubanSearchFilterTag !== "undefined") activeDoubanSearchFilterTag = "";
    if (typeof currentDoubanSearchFilterPageStart !== "undefined") currentDoubanSearchFilterPageStart = 0;
    if (typeof noMoreDoubanSearchFilterItems !== "undefined") noMoreDoubanSearchFilterItems = true;
    if (typeof isLoadingDoubanSearchFilterItems !== "undefined") isLoadingDoubanSearchFilterItems = false;
    const resultsDiv = document.getElementById("results");
    if (resultsDiv) {
      resultsDiv.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4";
    }
    await search();
    if (window.innerWidth <= 768) window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function renderDoubanMovieTvSwitch() {
  const movieToggle = document.getElementById("douban-movie-toggle");
  const tvToggle = document.getElementById("douban-tv-toggle");
  if (!movieToggle || !tvToggle) return;
  const switchType = (newType) => {
    if (doubanMovieTvCurrentSwitch !== newType) {
      doubanMovieTvCurrentSwitch = newType;
      doubanCurrentTag = "热门";
      movieToggle.classList.toggle("bg-pink-600", newType === "movie");
      movieToggle.classList.toggle("text-white", newType === "movie");
      movieToggle.classList.toggle("text-gray-300", newType !== "movie");
      tvToggle.classList.toggle("bg-pink-600", newType === "tv");
      tvToggle.classList.toggle("text-white", newType === "tv");
      tvToggle.classList.toggle("text-gray-300", newType !== "tv");
      renderDoubanTags();
      if (typeof initHomePageDoubanContent === "function") initHomePageDoubanContent();
    }
  };
  movieToggle.addEventListener("click", () => switchType("movie"));
  tvToggle.addEventListener("click", () => switchType("tv"));
}
function renderDoubanTags(tagsToRender = [], forceMainView = false) {
  const tagContainer = document.getElementById("douban-tags");
  if (!tagContainer) return;
  tagContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let currentActiveTagTitle;
  if (forceMainView || window.doubanCurrentTag === "__HOME__") {
    currentActiveTagTitle = "__HOME_ACTIVE_TAG__";
  } else {
    currentActiveTagTitle = window.doubanCurrentTag || (tagsToRender.length > 0 ? tagsToRender[0].title : "");
    if (!tagsToRender.some((t) => t.title === currentActiveTagTitle) && tagsToRender.length > 0) {
      currentActiveTagTitle = tagsToRender[0].title;
    }
  }
  tagsToRender.forEach((tagConfig) => {
    const btn = document.createElement("button");
    let btnClass = "py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ";
    if (currentActiveTagTitle === "__HOME_ACTIVE_TAG__") {
      btnClass += "bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white";
    } else {
      btnClass += tagConfig.title === currentActiveTagTitle ? "bg-pink-600 text-white shadow-md border-white" : "bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white";
    }
    btn.className = btnClass;
    btn.textContent = tagConfig.title;
    btn.onclick = function() {
      const pageHome = document.getElementById("page-home");
      const categoryViewPage = document.getElementById("page-category-view");
      const isOnCategoryView = categoryViewPage && !categoryViewPage.classList.contains("hidden");
      let isClickingCurrentActive = tagConfig.title === currentActiveTagTitle;
      if (currentActiveTagTitle === "__HOME_ACTIVE_TAG__") {
        isClickingCurrentActive = false;
      }
      if (isOnCategoryView && isClickingCurrentActive) {
        if (pageHome) pageHome.classList.remove("hidden");
        if (categoryViewPage) categoryViewPage.classList.add("hidden");
        document.querySelectorAll("#bottomNav .nav-item").forEach((item) => {
          item.classList.remove("active");
          if (item.dataset.page === "home") item.classList.add("active");
        });
        sessionStorage.setItem("activeTab", "home");
        window.doubanCurrentTag = "__HOME__";
        if (typeof initHomePageDoubanContent === "function") initHomePageDoubanContent();
        window.scrollTo(0, 0);
        sessionStorage.removeItem("homePageState");
        if (typeof saveHomePageState === "function") saveHomePageState();
        renderDoubanTags(tagsToRender, true);
      } else {
        window.doubanCurrentTag = tagConfig.title;
        if (typeof navigateToCategoryView === "function") {
          navigateToCategoryView(tagConfig.title, tagConfig.typeForCatView, tagConfig);
        }
        renderDoubanTags(tagsToRender, false);
      }
    };
    fragment.appendChild(btn);
  });
  tagContainer.appendChild(fragment);
  if (!forceMainView && window.doubanCurrentTag !== "__HOME__" && currentActiveTagTitle && currentActiveTagTitle !== "__HOME_ACTIVE_TAG__") {
    const categoryViewPage = document.getElementById("page-category-view");
    if (!categoryViewPage || categoryViewPage.classList.contains("hidden")) {
      const homePage = document.getElementById("page-home");
      if (homePage && !homePage.classList.contains("hidden")) {
        const activeTagConfig = tagsToRender.find((t) => t.title === currentActiveTagTitle);
        if (activeTagConfig && typeof navigateToCategoryView === "function") {
          navigateToCategoryView(activeTagConfig.title, activeTagConfig.typeForCatView, activeTagConfig);
        }
      }
    }
  }
}
function renderCarouselRow(categoryTitle, tag, type, sort = "recommend", pageLimit = 10, pageStart = 0) {
  console.warn("renderCarouselRow called, but home page now uses waterfall. Check if this call is still needed.");
  const mainContainer = document.getElementById("douban-recommendations-container");
  if (!mainContainer) return;
  const sectionId = `carousel-section-${type}-${categoryTitle.replace(/[^a-zA-Z0-9]/g, "-")}-${tag.replace(/[^a-zA-Z0-9]/g, "-")}`;
  let section = document.getElementById(sectionId);
  if (!section) {
    section = document.createElement("section");
    section.id = sectionId;
    section.className = "carousel-section space-y-3";
    mainContainer.appendChild(section);
  }
  const safeCategoryTitle = categoryTitle.replace(/</g, "<").replace(/>/g, ">");
  section.innerHTML = `
        <div class="flex justify-between items-center px-1">
            <h2 class="text-xl font-semibold text-white">${safeCategoryTitle}</h2>
        </div>
        <div class="carousel-container overflow-x-auto pb-2">
            <div id="carousel-track-${sectionId}" class="carousel-track flex space-x-3">
                <div class="text-gray-400 p-4">加载中...</div>
            </div>
        </div>`;
  const carouselTrack = section.querySelector(`#carousel-track-${sectionId}`);
  const doubanApiBase = "https://movie.douban.com";
  const targetUrl = `${doubanApiBase}/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${pageLimit}&page_start=${pageStart}`;
  if (typeof fetchDoubanData === "function") {
    fetchDoubanData(targetUrl).then((data) => renderDoubanCardsAsCarousel(data, carouselTrack, type, tag)).catch((error) => {
      console.error(`获取豆瓣数据失败 (Category: ${categoryTitle}, Tag: ${tag}, Type: ${type}, URL: ${targetUrl}):`, error);
      if (carouselTrack) carouselTrack.innerHTML = `<div class="text-red-400 p-4">❌ 加载 ${safeCategoryTitle} 失败</div>`;
    });
  } else {
    console.error("fetchDoubanData function not available in douban_ui.js for renderCarouselRow");
    if (carouselTrack) carouselTrack.innerHTML = `<div class="text-red-400 p-4">❌ 加载 ${safeCategoryTitle} 失败 (API Error)</div>`;
  }
}
function renderDoubanCardsAsCarousel(data, carouselTrackElement, type, tagForContext) {
  if (!carouselTrackElement) return;
  const fragment = document.createDocumentFragment();
  if (!data || !data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    carouselTrackElement.innerHTML = `<div class="text-gray-400 p-4">暂无内容</div>`;
    return;
  }
  data.subjects.forEach((item) => {
    const card = document.createElement("div");
    card.className = "flex-shrink-0 w-36 sm:w-40 bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
    const safeTitle = item.title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
    const safeRate = (item.rate || "暂无").replace(/</g, "<").replace(/>/g, ">");
    let originalCoverUrl = item.cover || "image/nomedia.png";
    if (originalCoverUrl && originalCoverUrl.includes("doubanio.com")) {
      originalCoverUrl = originalCoverUrl.replace(/@.*?$/, "");
    }
    let proxiedCoverUrl = "image/nomedia.png";
    if (typeof PROXY_URL !== "undefined" && PROXY_URL && item.cover) {
      proxiedCoverUrl = PROXY_URL + encodeURIComponent(item.cover);
    }
    card.innerHTML = `
            <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                <img src="${originalCoverUrl}" alt="${safeTitle}" 
                    class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                    loading="lazy" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div class="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    <span class="text-yellow-400">★</span> ${safeRate}
                </div>
            </div>
            <div class="p-1.5 text-center bg-[#111]">
                <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
                        class="text-xs font-medium text-white truncate w-full hover:text-pink-400 transition leading-tight"
                        title="${safeTitle}">
                    ${safeTitle}
                </button>
            </div>
        `;
    fragment.appendChild(card);
  });
  carouselTrackElement.innerHTML = "";
  carouselTrackElement.appendChild(fragment);
}
function renderCategoryGridCards(data, gridContainer) {
  if (!gridContainer) return;
  const fragment = document.createDocumentFragment();
  if (!data || !data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    if (gridContainer.innerHTML === "" || gridContainer.innerHTML.includes("正在加载")) {
      gridContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">此分类下暂无内容</p>';
    }
    return;
  }
  data.subjects.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md flex flex-col";
    const safeTitle = item.title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
    const safeRate = (item.rate || "暂无").replace(/</g, "<").replace(/>/g, ">");
    let coverImage = item.cover_url || item.cover || "image/nomedia.png";
    if (coverImage && coverImage.includes("doubanio.com")) {
      coverImage = coverImage.replace(/@.*?$/, "");
    }
    let proxiedCoverUrl = "image/nomedia.png";
    if (typeof PROXY_URL !== "undefined" && PROXY_URL && (item.cover_url || item.cover)) {
      proxiedCoverUrl = PROXY_URL + encodeURIComponent(item.cover_url || item.cover);
    }
    card.innerHTML = `
            <div class="relative w-full aspect-[2/3] overflow-hidden" onclick="fillAndSearchWithDouban('${safeTitle}')">
                <img src="${coverImage}" alt="${safeTitle}" 
                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                     onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                     loading="lazy" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div class="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    <span class="text-yellow-400">★</span> ${safeRate}
                </div>
            </div>
            <div class="p-2 text-center flex-grow flex flex-col justify-between bg-[#111]">
                <h3 class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition leading-tight" title="${safeTitle}" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    ${safeTitle}
                </h3>
            </div>
        `;
    fragment.appendChild(card);
  });
  gridContainer.appendChild(fragment);
}
function renderDoubanSearchResultsGrid(data, gridContainer) {
  if (!gridContainer) return;
  const fragment = document.createDocumentFragment();
  if (!data || !data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    return;
  }
  data.subjects.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md flex flex-col";
    const safeTitle = item.title.replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"');
    const safeRate = (item.rate || "暂无").replace(/</g, "<").replace(/>/g, ">");
    let coverImage = item.cover_url || item.cover || "image/nomedia.png";
    if (coverImage && coverImage.includes("doubanio.com")) {
      coverImage = coverImage.replace(/@.*?$/, "");
    }
    let proxiedCoverUrl = "image/nomedia.png";
    if (typeof PROXY_URL !== "undefined" && PROXY_URL && (item.cover_url || item.cover)) {
      proxiedCoverUrl = PROXY_URL + encodeURIComponent(item.cover_url || item.cover);
    }
    card.innerHTML = `
            <div class="relative w-full aspect-[2/3] overflow-hidden" onclick="fillAndSearchWithDouban('${safeTitle}')">
                <img src="${coverImage}" alt="${safeTitle}" 
                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                     onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                     loading="lazy" referrerpolicy="no-referrer">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div class="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    <span class="text-yellow-400">★</span> ${safeRate}
                </div>
            </div>
            <div class="p-2 text-center flex-grow flex flex-col justify-between bg-[#111]">
                <h3 class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition leading-tight" title="${safeTitle}" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    ${safeTitle}
                </h3>
            </div>
        `;
    fragment.appendChild(card);
  });
  gridContainer.appendChild(fragment);
}
