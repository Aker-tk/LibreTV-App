let wakeLock = null;
const requestWakeLock = async () => {
  try {
    if (wakeLock !== null) {
      await wakeLock.release();
      wakeLock = null;
    }
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.error("请求屏幕唤醒锁失败:", err);
  }
};
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    await requestWakeLock();
  } else if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (err) {
      console.error("释放屏幕唤醒锁失败:", err);
    }
  }
});
if (document.visibilityState === "visible") {
  requestWakeLock();
  console.log("请求唤醒锁成功");
}
