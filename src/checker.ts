import pLimit from 'p-limit';
import type { Sitemap, UrlCheckResult } from './types.js';

export async function fetchWithRedirects(
  url: string,
  method: 'HEAD' | 'GET',
  timeout: number,
  maxRedirects: number,
): Promise<{ status: number }> {
  let currentUrl = url;
  let redirectCount = 0;

  while (true) {
    const res = await fetch(currentUrl, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
    });

    const location = res.headers.get('location');
    if (location && res.status >= 300 && res.status < 400) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        return { status: res.status };
      }
      // Resolve relative redirects
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return { status: res.status };
  }
}

export async function checkUrl(
  url: string,
  timeout: number,
  maxRedirects: number,
): Promise<UrlCheckResult> {
  try {
    // Try HEAD first
    const headResult = await fetchWithRedirects(url, 'HEAD', timeout, maxRedirects);

    // Fall back to GET on 405 Method Not Allowed or 403 Forbidden
    if (headResult.status === 405 || headResult.status === 403) {
      const getResult = await fetchWithRedirects(url, 'GET', timeout, maxRedirects);
      return { url, statusCode: getResult.status };
    }

    return { url, statusCode: headResult.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, statusCode: 0, error: message };
  }
}

export async function checkUrls(
  sitemap: Sitemap,
  concurrency: number,
  timeout: number,
  maxRedirects: number,
  onProgress: () => void,
): Promise<UrlCheckResult[]> {
  const limit = pLimit(concurrency);

  const tasks = sitemap.urls.map((u) =>
    limit(async () => {
      const result = await checkUrl(u.loc, timeout, maxRedirects);
      onProgress();
      return result;
    }),
  );

  return Promise.all(tasks);
}
