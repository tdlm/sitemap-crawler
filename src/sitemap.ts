import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'node:zlib';
import chalk from 'chalk';
import type { Sitemap, SitemapUrl } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === 'sitemap' || name === 'url',
});

export function parseUrls(urlset: any): SitemapUrl[] {
  const urls: any[] = urlset?.url ?? [];
  return urls.map((u: any) => ({
    loc: u.loc,
    lastmod: u.lastmod,
    changefreq: u.changefreq,
    priority: u.priority != null ? Number(u.priority) : undefined,
  }));
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }

  // Only manually decompress when the file itself is gzipped (.xml.gz).
  // Node's fetch already handles transport-level content-encoding automatically.
  if (url.endsWith('.gz')) {
    const buffer = Buffer.from(await res.arrayBuffer());
    return gunzipSync(buffer).toString('utf-8');
  }

  return res.text();
}

export async function parseSitemap(url: string, xml: string): Promise<Sitemap> {
  const parsed = parser.parse(xml);
  const urlset = parsed.urlset;
  if (!urlset) {
    throw new Error(`No <urlset> found in ${url}`);
  }
  return {
    name: url,
    urls: parseUrls(urlset),
  };
}

export async function fetchSitemaps(url: string): Promise<Sitemap[]> {
  const xml = await fetchXml(url);
  const parsed = parser.parse(xml);

  // Check if this is a sitemap index
  if (parsed.sitemapindex) {
    const sitemaps: any[] = parsed.sitemapindex.sitemap ?? [];
    const results: Sitemap[] = [];

    for (const entry of sitemaps) {
      const subUrl: string = entry.loc;
      try {
        const subXml = await fetchXml(subUrl);
        const sitemap = await parseSitemap(subUrl, subXml);
        results.push(sitemap);
      } catch (err) {
        console.warn(
          chalk.yellow(`Warning: Failed to fetch sub-sitemap ${subUrl}: ${err instanceof Error ? err.message : err}`)
        );
      }
    }

    return results;
  }

  // Single sitemap
  if (parsed.urlset) {
    return [{
      name: url,
      urls: parseUrls(parsed.urlset),
    }];
  }

  throw new Error('XML does not contain a <urlset> or <sitemapindex> root element');
}
