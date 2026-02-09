# AGENTS.md — AI Agent Instructions

## Commands

```bash
pnpm install      # Install dependencies
pnpm build        # Compile TypeScript to dist/
pnpm crawl <url>  # Run compiled version
pnpm dev <url>    # Run in development mode with tsx
```

## Todos

TODOS are available in TODOS.md. Remove items from TODOS.md as they are completed.

## Architecture

### Module Overview

| File | Responsibility |
|------|---------------|
| `src/index.ts` | CLI entry point — Commander setup, orchestration |
| `src/types.ts` | Shared TypeScript types |
| `src/sitemap.ts` | Fetch & parse sitemap XML / sitemap index |
| `src/checker.ts` | HTTP status checking with p-limit concurrency |
| `src/output.ts` | Progress bars (cli-progress) + report printing (chalk) |
| `src/csv-report.ts` | CSV file generation (csv-stringify) |

### Data Flow

```
CLI args → fetchSitemaps(url) → [Sitemap, Sitemap, ...]
  → for each Sitemap (sequentially):
      → create progress bar
      → checkUrls() with p-limit concurrency
      → aggregate into SitemapReport
  → printReport(reports, verbose)
  → writeCsvReport(reports, csvPath) if --csv
```

## Key Patterns

- **ESM**: Project uses `"type": "module"` — all imports use `.js` extensions
- **fast-xml-parser `isArray`**: The parser's `isArray` option is set for `sitemap` and `url` elements to prevent the single-item-not-array bug
- **p-limit concurrency**: URL checking uses `p-limit` to cap concurrent HTTP requests
- **HEAD-then-GET**: Tries HEAD first, falls back to GET on 405/403 responses
- **Manual redirects**: Uses `redirect: 'manual'` with manual `Location` header following, configurable max redirects
- **Gzip support**: Detects `.gz` URL extension and decompresses with `zlib.gunzipSync()` (Node's fetch handles transport-level gzip automatically)

## Type System

- `SitemapUrl` — Single URL entry from a sitemap (`loc`, `lastmod`, `changefreq`, `priority`)
- `Sitemap` — A parsed sitemap with `name` (source URL) and `urls` array
- `UrlCheckResult` — Result of checking a URL (`url`, `statusCode`, optional `error`)
- `SitemapReport` — Associates a `Sitemap` with its `UrlCheckResult[]`
- `CrawlOptions` — CLI options (`concurrency`, `timeout`, `maxRedirects`, `verbose`, `csv`)

## Error Handling

- **Fatal** (exit 1): invalid URL, root sitemap fetch/parse failure
- **Partial** (warn + continue): sub-sitemap fetch failures
- **Expected** (recorded in results): individual URL 4xx/5xx/timeouts (statusCode 0 for network errors)
