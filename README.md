# sitemap-crawler

CLI tool that crawls sitemap XML files (indexes or single sitemaps), checks the HTTP status of every URL, and reports results with pretty terminal output.

## Features

- Supports sitemap index files and single sitemaps
- Handles gzipped (`.xml.gz`) sitemaps
- Concurrent HTTP checking with configurable limits
- HEAD-first requests with GET fallback
- Manual redirect following with configurable max
- Color-coded terminal output (2xx green, 3xx yellow, 4xx/5xx red)
- Progress bars for each sitemap
- CSV report export
- Verbose mode with full URL listing
- Zyte Smart Proxy Manager support

## Installation

```bash
pnpm install
pnpm build
```

## Usage

```bash
# Run compiled version (requires pnpm build first)
pnpm crawl <url>

# Run in development mode (no build needed)
pnpm dev <url>
```

### Examples

```bash
# Basic crawl with summary output
pnpm crawl https://www.sitemaps.org/sitemap.xml

# Verbose output showing every URL
pnpm crawl -v https://www.sitemaps.org/sitemap.xml

# Export results to CSV
pnpm crawl --csv report.csv https://www.sitemaps.org/sitemap.xml

# Custom concurrency and timeout
pnpm crawl -c 20 -t 5000 https://example.com/sitemap.xml

# Crawl through Zyte Smart Proxy Manager (requires ZYTE_API_KEY in .env)
cp .env.example .env
# Edit .env and add your Zyte API key
pnpm crawl https://example.com/sitemap.xml

# Use a custom proxy URL
pnpm crawl -p http://localhost:8011 https://example.com/sitemap.xml
```

## CLI Options

```
Usage: sitemap-crawler [options] <url>

Arguments:
  url                      URL to a sitemap XML or sitemap index XML

Options:
  -v, --verbose            show full URL listing instead of summary counts
  --csv <filepath>         write results to a CSV file
  -c, --concurrency <n>    max concurrent requests (default: 10)
  -t, --timeout <ms>       per-request timeout in ms (default: 10000)
  -r, --max-redirects <n>  max redirects to follow per URL (default: 3)
  -d, --delay <ms>         delay in ms between requests (default: 10)
  -p, --proxy-url [url]    enable Zyte proxy, optionally specify URL (default: http://proxy.zyte.com:8011)
  -h, --help               display help
```

## Output

### Default (summary)

Shows status code counts per sitemap, color-coded:

```
=== Crawl Results ===

https://example.com/sitemap.xml
  Total: 42 URLs — 200: 38, 301: 2, 404: 2
```

### Verbose (`-v`)

Shows every URL with its status code, plus the summary:

```
=== Crawl Results ===

https://example.com/sitemap.xml
  200  https://example.com/page1
  200  https://example.com/page2
  404  https://example.com/old-page

  Total: 3 URLs — 200: 2, 404: 1
```

## Proxy Support

To route requests through [Zyte Smart Proxy Manager](https://www.zyte.com/smart-proxy-manager/):

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Add your API key to `.env`:
   ```
   ZYTE_API_KEY=your-api-key-here
   ```
3. Run normally — the proxy is activated automatically when `ZYTE_API_KEY` is set:
   ```bash
   pnpm crawl https://example.com/sitemap.xml
   ```

The default proxy endpoint is `http://proxy.zyte.com:8011`. Override it with `--proxy-url` if needed.

## Requirements

- Node.js 20+
