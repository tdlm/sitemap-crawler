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

## Installation

```bash
pnpm install
pnpm build
```

## Usage

```bash
# Using tsx (development)
pnpm dev <url>

# Using compiled output
pnpm start <url>

# Direct invocation
pnpm tsx src/index.ts <url>
```

### Examples

```bash
# Basic crawl with summary output
pnpm tsx src/index.ts https://www.sitemaps.org/sitemap.xml

# Verbose output showing every URL
pnpm tsx src/index.ts -v https://www.sitemaps.org/sitemap.xml

# Export results to CSV
pnpm tsx src/index.ts --csv report.csv https://www.sitemaps.org/sitemap.xml

# Custom concurrency and timeout
pnpm tsx src/index.ts -c 20 -t 5000 https://example.com/sitemap.xml
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

## Requirements

- Node.js 20+
