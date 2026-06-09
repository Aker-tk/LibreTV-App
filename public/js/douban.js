if (typeof initDouban === "function") {
  initDouban();
} else {
  console.error("Failed to initialize Douban features: initDouban function not found. Check script load order.");
}
