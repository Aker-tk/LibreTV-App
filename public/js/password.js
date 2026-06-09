function isPasswordProtected() {
  const pwd = window.__ENV__ && window.__ENV__.PASSWORD;
  return typeof pwd === "string" && pwd.length === 64 && !/^0+$/.test(pwd);
}
function isPasswordVerified() {
  try {
    if (!isPasswordProtected()) {
      return true;
    }
    const verificationData = JSON.parse(localStorage.getItem(PASSWORD_CONFIG.localStorageKey) || "{}");
    const { verified, timestamp, passwordHash } = verificationData;
    const currentHash = window.__ENV__ && window.__ENV__.PASSWORD;
    if (verified && timestamp && passwordHash === currentHash) {
      const now = Date.now();
      const expiry = timestamp + PASSWORD_CONFIG.verificationTTL;
      return now < expiry;
    }
    return false;
  } catch (error) {
    console.error("验证密码状态时出错:", error);
    return false;
  }
}
window.isPasswordProtected = isPasswordProtected;
window.isPasswordVerified = isPasswordVerified;
async function verifyPassword(password) {
  const correctHash = window.__ENV__ && window.__ENV__.PASSWORD;
  if (!correctHash) return false;
  const inputHash = await sha256(password);
  const isValid = inputHash === correctHash;
  if (isValid) {
    const verificationData = {
      verified: true,
      timestamp: Date.now(),
      passwordHash: correctHash
      // 保存当前密码的哈希值
    };
    localStorage.setItem(PASSWORD_CONFIG.localStorageKey, JSON.stringify(verificationData));
  }
  return isValid;
}
async function sha256(message) {
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  if (typeof window._jsSha256 === "function") {
    return window._jsSha256(message);
  }
  throw new Error("No SHA-256 implementation available.");
}
function showPasswordModal() {
  const passwordModal = document.getElementById("passwordModal");
  if (passwordModal) {
    passwordModal.style.display = "flex";
    setTimeout(() => {
      const passwordInput = document.getElementById("passwordInput");
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }
}
function hidePasswordModal() {
  const passwordModal = document.getElementById("passwordModal");
  if (passwordModal) {
    passwordModal.style.display = "none";
  }
}
function showPasswordError() {
  const errorElement = document.getElementById("passwordError");
  if (errorElement) {
    errorElement.classList.remove("hidden");
  }
}
function hidePasswordError() {
  const errorElement = document.getElementById("passwordError");
  if (errorElement) {
    errorElement.classList.add("hidden");
  }
}
async function handlePasswordSubmit() {
  const passwordInput = document.getElementById("passwordInput");
  const password = passwordInput ? passwordInput.value.trim() : "";
  if (await verifyPassword(password)) {
    hidePasswordError();
    hidePasswordModal();
    document.dispatchEvent(new CustomEvent("passwordVerified"));
  } else {
    showPasswordError();
    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.focus();
    }
  }
}
function initPasswordProtection() {
  if (!isPasswordProtected()) {
    return;
  }
  if (!isPasswordVerified()) {
    showPasswordModal();
    const submitButton = document.getElementById("passwordSubmitBtn");
    if (submitButton) {
      submitButton.addEventListener("click", handlePasswordSubmit);
    }
    const passwordInput = document.getElementById("passwordInput");
    if (passwordInput) {
      passwordInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
          handlePasswordSubmit();
        }
      });
    }
  }
}
document.addEventListener("DOMContentLoaded", initPasswordProtection);
