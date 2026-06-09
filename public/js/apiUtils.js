function isLikelyTauriEnvironment() {
  if (typeof window !== "undefined") {
    if (!!window.__TAURI_IPC__ || !!window.__TAURI_METADATA__ || !!window.__TAURI__) return true;
    if (window.location.protocol === "tauri:") return true;
    if (window.location.hostname === "tauri.localhost") return true;
    if (navigator.userAgent.includes("Tauri")) return true;
  }
  return false;
}
const tauriConstants = {
  get invoke() {
    if (typeof window !== "undefined") {
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
        return window.__TAURI_INTERNALS__.invoke;
      }
      if (window.__TAURI__ && typeof window.__TAURI__ === "object") {
        if (typeof window.__TAURI__.invoke === "function") {
          return window.__TAURI__.invoke;
        }
        if (window.__TAURI__.core && typeof window.__TAURI__.core.invoke === "function") {
          return window.__TAURI__.core.invoke;
        }
        if (window.__TAURI__.tauri && typeof window.__TAURI__.tauri.invoke === "function") {
          return window.__TAURI__.tauri.invoke;
        }
      }
    }
    return null;
  },
  TIMEOUT_SECS: 20
  // Default timeout for Rust HTTP client & JS fetch fallback
};
const createApiError = (message, statusCode) => {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  return err;
};
