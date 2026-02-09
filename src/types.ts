export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

export type Sitemap = {
  name: string;
  urls: SitemapUrl[];
};

export type UrlCheckResult = {
  url: string;
  statusCode: number;
  error?: string;
};

export type SitemapReport = {
  sitemap: Sitemap;
  results: UrlCheckResult[];
};

export type CrawlOptions = {
  concurrency: number;
  timeout: number;
  maxRedirects: number;
  verbose: boolean;
  csv?: string;
};
