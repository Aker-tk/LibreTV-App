function initAPICheckboxes() {
  const container = document.getElementById("apiCheckboxes");
  if (!container) {
    console.error("API checkboxes container not found!");
    return;
  }
  container.innerHTML = "";
  const normaldiv = document.createElement("div");
  normaldiv.id = "normaldiv";
  normaldiv.className = "grid grid-cols-2 gap-2";
  const normalTitle = document.createElement("div");
  normalTitle.className = "api-group-title";
  normalTitle.textContent = "普通资源";
  normaldiv.appendChild(normalTitle);
  Object.keys(API_SITES).forEach((apiKey) => {
    const api = API_SITES[apiKey];
    if (api.adult) return;
    const checked = selectedAPIs.includes(apiKey);
    const checkbox = document.createElement("div");
    checkbox.className = "flex items-center";
    checkbox.innerHTML = '\n            <input type="checkbox" id="api_'.concat(apiKey, '" \n                   class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333]" \n                   ').concat(checked ? "checked" : "", ' \n                   data-api="').concat(apiKey, '">\n            <label for="api_').concat(apiKey, '" class="ml-1 text-xs text-gray-400 truncate">').concat(api.name, "</label>\n        ");
    normaldiv.appendChild(checkbox);
    checkbox.querySelector("input").addEventListener("change", function() {
      updateSelectedAPIs();
      checkAdultAPIsSelected();
    });
  });
  container.appendChild(normaldiv);
  addAdultAPI();
  checkAdultAPIsSelected();
}
function addAdultAPI() {
  if (!HIDE_BUILTIN_ADULT_APIS && localStorage.getItem("yellowFilterEnabled") === "false") {
    const container = document.getElementById("apiCheckboxes");
    if (!container) return;
    const adultdiv = document.createElement("div");
    adultdiv.id = "adultdiv";
    adultdiv.className = "grid grid-cols-2 gap-2";
    const adultTitle = document.createElement("div");
    adultTitle.className = "api-group-title adult";
    adultTitle.innerHTML = '黄色资源采集站 <span class="adult-warning">\n            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />\n            </svg>\n        </span>';
    adultdiv.appendChild(adultTitle);
    Object.keys(API_SITES).forEach((apiKey) => {
      const api = API_SITES[apiKey];
      if (!api.adult) return;
      const checked = selectedAPIs.includes(apiKey);
      const checkbox = document.createElement("div");
      checkbox.className = "flex items-center";
      checkbox.innerHTML = '\n                <input type="checkbox" id="api_'.concat(apiKey, '" \n                       class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333] api-adult" \n                       ').concat(checked ? "checked" : "", ' \n                       data-api="').concat(apiKey, '">\n                <label for="api_').concat(apiKey, '" class="ml-1 text-xs text-pink-400 truncate">').concat(api.name, "</label>\n            ");
      adultdiv.appendChild(checkbox);
      checkbox.querySelector("input").addEventListener("change", function() {
        updateSelectedAPIs();
        checkAdultAPIsSelected();
      });
    });
    container.appendChild(adultdiv);
  }
}
function checkAdultAPIsSelected() {
  const adultBuiltinCheckboxes = document.querySelectorAll("#apiCheckboxes .api-adult:checked");
  const customApiCheckboxes = document.querySelectorAll("#customApisList .api-adult:checked");
  const hasAdultSelected = adultBuiltinCheckboxes.length > 0 || customApiCheckboxes.length > 0;
  const yellowFilterToggle = document.getElementById("yellowFilterToggle");
  if (!yellowFilterToggle) return;
  const yellowFilterContainer = yellowFilterToggle.closest("div").parentNode;
  const filterDescription = yellowFilterContainer.querySelector("p.filter-description");
  if (hasAdultSelected) {
    yellowFilterToggle.checked = false;
    yellowFilterToggle.disabled = true;
    localStorage.setItem("yellowFilterEnabled", "false");
    yellowFilterContainer.classList.add("filter-disabled");
    if (filterDescription) {
      filterDescription.innerHTML = '<strong class="text-pink-300">选中黄色资源站时无法启用此过滤</strong>';
    }
    const existingTooltip = yellowFilterContainer.querySelector(".filter-tooltip");
    if (existingTooltip) existingTooltip.remove();
  } else {
    yellowFilterToggle.disabled = false;
    yellowFilterContainer.classList.remove("filter-disabled");
    if (filterDescription) {
      filterDescription.innerHTML = '过滤"伦理片"等黄色内容';
    }
    const existingTooltip = yellowFilterContainer.querySelector(".filter-tooltip");
    if (existingTooltip) existingTooltip.remove();
  }
}
function renderCustomAPIsList() {
  const container = document.getElementById("customApisList");
  if (!container) return;
  if (customAPIs.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 text-center my-2">未添加自定义API</p>';
    return;
  }
  container.innerHTML = "";
  customAPIs.forEach((api, index) => {
    const apiItem = document.createElement("div");
    apiItem.className = "flex items-center justify-between p-1 mb-1 bg-[#222] rounded";
    const textColorClass = api.isAdult ? "text-pink-400" : "text-white";
    const adultTag = api.isAdult ? '<span class="text-xs text-pink-400 mr-1">(18+)</span>' : "";
    const detailLine = api.detail ? '<div class="text-xs text-gray-400 truncate">detail: '.concat(api.detail, "</div>") : "";
    apiItem.innerHTML = '\n            <div class="flex items-center flex-1 min-w-0">\n                <input type="checkbox" id="custom_api_'.concat(index, '" \n                       class="form-checkbox h-3 w-3 text-blue-600 mr-1 ').concat(api.isAdult ? "api-adult" : "", '" \n                       ').concat(selectedAPIs.includes("custom_" + index) ? "checked" : "", ' \n                       data-custom-index="').concat(index, '">\n                <div class="flex-1 min-w-0">\n                    <div class="text-xs font-medium ').concat(textColorClass, ' truncate">\n                        ').concat(adultTag).concat(api.name, '\n                    </div>\n                    <div class="text-xs text-gray-500 truncate">').concat(api.url, "</div>\n                    ").concat(detailLine, '\n                </div>\n            </div>\n            <div class="flex items-center">\n                <button class="text-blue-500 hover:text-blue-700 text-xs px-1" onclick="editCustomApi(').concat(index, ')">✎</button>\n                <button class="text-red-500 hover:text-red-700 text-xs px-1" onclick="removeCustomApi(').concat(index, ')">✕</button>\n            </div>\n        ');
    container.appendChild(apiItem);
    apiItem.querySelector("input").addEventListener("change", function() {
      updateSelectedAPIs();
      checkAdultAPIsSelected();
    });
  });
}
function editCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;
  const api = customAPIs[index];
  document.getElementById("customApiName").value = api.name;
  document.getElementById("customApiUrl").value = api.url;
  document.getElementById("customApiDetail").value = api.detail || "";
  const isAdultInput = document.getElementById("customApiIsAdult");
  if (isAdultInput) isAdultInput.checked = api.isAdult || false;
  const form = document.getElementById("addCustomApiForm");
  if (form) {
    form.classList.remove("hidden");
    const buttonContainer = form.querySelector("div:last-child");
    buttonContainer.innerHTML = '\n            <button type="button" onclick="updateCustomApi('.concat(index, ')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">更新</button>\n            <button type="button" onclick="cancelEditCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>\n        ');
  }
}
function updateCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;
  const nameInput = document.getElementById("customApiName");
  const urlInput = document.getElementById("customApiUrl");
  const detailInput = document.getElementById("customApiDetail");
  const isAdultInput = document.getElementById("customApiIsAdult");
  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  const detail = detailInput ? detailInput.value.trim() : "";
  const isAdult = isAdultInput ? isAdultInput.checked : false;
  if (!name || !url) {
    if (typeof showToast === "function") showToast("请输入API名称和链接", "warning");
    else console.warn("showToast not defined");
    return;
  }
  if (!/^https?:\/\/.+/.test(url)) {
    if (typeof showToast === "function") showToast("API链接格式不正确，需以http://或https://开头", "warning");
    else console.warn("showToast not defined");
    return;
  }
  if (url.endsWith("/")) url = url.slice(0, -1);
  customAPIs[index] = { name, url, detail, isAdult };
  localStorage.setItem("customAPIs", JSON.stringify(customAPIs));
  renderCustomAPIsList();
  checkAdultAPIsSelected();
  restoreAddCustomApiButtons();
  nameInput.value = "";
  urlInput.value = "";
  if (detailInput) detailInput.value = "";
  if (isAdultInput) isAdultInput.checked = false;
  document.getElementById("addCustomApiForm").classList.add("hidden");
  if (typeof showToast === "function") showToast("已更新自定义API: " + name, "success");
  else console.log("Updated custom API: " + name);
}
function cancelEditCustomApi() {
  document.getElementById("customApiName").value = "";
  document.getElementById("customApiUrl").value = "";
  document.getElementById("customApiDetail").value = "";
  const isAdultInput = document.getElementById("customApiIsAdult");
  if (isAdultInput) isAdultInput.checked = false;
  document.getElementById("addCustomApiForm").classList.add("hidden");
  restoreAddCustomApiButtons();
}
function restoreAddCustomApiButtons() {
  const form = document.getElementById("addCustomApiForm");
  if (!form) return;
  const buttonContainer = form.querySelector("div:last-child");
  if (!buttonContainer) return;
  buttonContainer.innerHTML = '\n        <button type="button" onclick="addCustomApi()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">添加</button>\n        <button type="button" onclick="cancelAddCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">取消</button>\n    ';
}
function updateSelectedAPIs() {
  const builtInApiCheckboxes = document.querySelectorAll("#apiCheckboxes input:checked");
  const builtInApis = Array.from(builtInApiCheckboxes).map((input) => input.dataset.api);
  const customApiCheckboxes = document.querySelectorAll("#customApisList input:checked");
  const customApiIndices = Array.from(customApiCheckboxes).map((input) => "custom_" + input.dataset.customIndex);
  selectedAPIs = builtInApis.concat(customApiIndices);
  localStorage.setItem("selectedAPIs", JSON.stringify(selectedAPIs));
  updateSelectedApiCount();
}
function updateSelectedApiCount() {
  const countEl = document.getElementById("selectedApiCount");
  if (countEl) {
    countEl.textContent = selectedAPIs.length;
  }
}
function selectAllAPIs(selectAll = true, excludeAdult = false) {
  const checkboxes = document.querySelectorAll('#apiCheckboxes input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    if (excludeAdult && checkbox.classList.contains("api-adult")) {
      checkbox.checked = false;
    } else {
      checkbox.checked = selectAll;
    }
  });
  updateSelectedAPIs();
  checkAdultAPIsSelected();
}
function showAddCustomApiForm() {
  const form = document.getElementById("addCustomApiForm");
  if (form) {
    form.classList.remove("hidden");
  }
}
function cancelAddCustomApi() {
  const form = document.getElementById("addCustomApiForm");
  if (form) {
    form.classList.add("hidden");
    document.getElementById("customApiName").value = "";
    document.getElementById("customApiUrl").value = "";
    document.getElementById("customApiDetail").value = "";
    const isAdultInput = document.getElementById("customApiIsAdult");
    if (isAdultInput) isAdultInput.checked = false;
    restoreAddCustomApiButtons();
  }
}
function addCustomApi() {
  const nameInput = document.getElementById("customApiName");
  const urlInput = document.getElementById("customApiUrl");
  const detailInput = document.getElementById("customApiDetail");
  const isAdultInput = document.getElementById("customApiIsAdult");
  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  const detail = detailInput ? detailInput.value.trim() : "";
  const isAdult = isAdultInput ? isAdultInput.checked : false;
  if (!name || !url) {
    if (typeof showToast === "function") showToast("请输入API名称和链接", "warning");
    else console.warn("showToast not defined");
    return;
  }
  if (!/^https?:\/\/.+/.test(url)) {
    if (typeof showToast === "function") showToast("API链接格式不正确，需以http://或https://开头", "warning");
    else console.warn("showToast not defined");
    return;
  }
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  customAPIs.push({ name, url, detail, isAdult });
  localStorage.setItem("customAPIs", JSON.stringify(customAPIs));
  const newApiIndex = customAPIs.length - 1;
  selectedAPIs.push("custom_" + newApiIndex);
  localStorage.setItem("selectedAPIs", JSON.stringify(selectedAPIs));
  renderCustomAPIsList();
  updateSelectedApiCount();
  checkAdultAPIsSelected();
  nameInput.value = "";
  urlInput.value = "";
  if (detailInput) detailInput.value = "";
  if (isAdultInput) isAdultInput.checked = false;
  document.getElementById("addCustomApiForm").classList.add("hidden");
  if (typeof showToast === "function") showToast("已添加自定义API: " + name, "success");
  else console.log("Added custom API: " + name);
}
function removeCustomApi(index) {
  if (index < 0 || index >= customAPIs.length) return;
  const apiName = customAPIs[index].name;
  customAPIs.splice(index, 1);
  localStorage.setItem("customAPIs", JSON.stringify(customAPIs));
  const customApiId = "custom_" + index;
  selectedAPIs = selectedAPIs.filter((id) => id !== customApiId);
  selectedAPIs = selectedAPIs.map((id) => {
    if (id.startsWith("custom_")) {
      const currentIndex = parseInt(id.replace("custom_", ""));
      if (currentIndex > index) {
        return "custom_" + (currentIndex - 1);
      }
    }
    return id;
  });
  localStorage.setItem("selectedAPIs", JSON.stringify(selectedAPIs));
  renderCustomAPIsList();
  updateSelectedApiCount();
  checkAdultAPIsSelected();
  if (typeof showToast === "function") showToast("已移除自定义API: " + apiName, "info");
  else console.log("Removed custom API: " + apiName);
}
function getCustomApiInfo(customApiIndex) {
  const index = parseInt(customApiIndex);
  if (isNaN(index) || index < 0 || index >= customAPIs.length) {
    return null;
  }
  return customAPIs[index];
}
