export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface Sitemap {
  name: string;
  urls: SitemapUrl[];
}

export interface UrlCheckResult {
  url: string;
  statusCode: number;
  error?: string;
}

export interface SitemapReport {
  sitemap: Sitemap;
  results: UrlCheckResult[];
}

export interface CrawlOptions {
  concurrency: number;
  timeout: number;
  maxRedirects: number;
  verbose: boolean;
  csv?: string;
}
