let selectedAPIs = JSON.parse(localStorage.getItem("selectedAPIs") || '["tyyszy","xiaomaomi","dyttzy", "bfzy", "ruyi"]');
let customAPIs = JSON.parse(localStorage.getItem("customAPIs") || "[]");
let currentEpisodeIndex = 0;
let currentEpisodes = [];
let currentVideoTitle = "";
let episodesReversed = false;
