export const VERSION_URLS = {
  PROXY: 'https://raw.ihtw.moe/raw.githubusercontent.com/LibreSpark/LibreTV/main/VERSION.txt',
  DIRECT: 'https://raw.githubusercontent.com/LibreSpark/LibreTV/main/VERSION.txt',
};

export async function resolveLatestVersion({
  isTauriEnvironment,
  tauriRequest,
  webFetch,
}) {
  if (isTauriEnvironment) {
    try {
      return await tauriRequest(VERSION_URLS.PROXY);
    } catch (proxyError) {
      return await tauriRequest(VERSION_URLS.DIRECT, proxyError);
    }
  }

  try {
    return await webFetch(VERSION_URLS.PROXY);
  } catch (proxyError) {
    return await webFetch(VERSION_URLS.DIRECT, proxyError);
  }
}
