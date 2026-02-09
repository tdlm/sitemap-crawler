#!/usr/bin/env node

import 'dotenv/config';
import { basename, resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { fetchSitemaps } from './sitemap.js';
import { checkUrls } from './checker.js';
import { createMultiBar, printReport } from './output.js';
import { writeCsvReport } from './csv-report.js';
import { initializeProxy } from './proxy.js';
import type { SitemapReport } from './types.js';

function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error(chalk.red(`Error: --${name} must be a positive integer, got "${value}"`));
    process.exit(1);
  }
  return n;
}

function parseNonNegativeInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    console.error(chalk.red(`Error: --${name} must be a non-negative integer, got "${value}"`));
    process.exit(1);
  }
  return n;
}

function safeCsvPath(input: string): string {
  // Strip directory components — only the filename is used
  const filename = basename(input);
  if (!filename || filename === '.' || filename === '..') {
    console.error(chalk.red(`Error: invalid CSV filename "${input}"`));
    process.exit(1);
  }
  const reportsDir = resolve('reports');
  const resolved = resolve(reportsDir, filename);
  // Belt-and-suspenders: ensure the resolved path is inside reports/
  if (!resolved.startsWith(reportsDir + '/') && resolved !== reportsDir) {
    console.error(chalk.red(`Error: invalid CSV filename "${input}"`));
    process.exit(1);
  }
  return resolved;
}

const program = new Command();

program
  .name('sitemap-crawler')
  .description('Crawl sitemap XML files and check HTTP status of every URL')
  .argument('<url>', 'URL to a sitemap XML or sitemap index XML')
  .option('-v, --verbose', 'show full URL listing instead of summary counts')
  .option('--csv <filepath>', 'write results to a CSV file')
  .option('-c, --concurrency <n>', 'max concurrent requests', '10')
  .option('-t, --timeout <ms>', 'per-request timeout in ms', '10000')
  .option('-r, --max-redirects <n>', 'max redirects to follow per URL', '3')
  .option('-d, --delay <ms>', 'delay in ms between requests', '10')
  .option('--max-retries <n>', 'max retries for 503/timeout errors', '3')
  .option('-p, --proxy-url [url]', 'enable Zyte proxy (optionally specify URL)', 'http://proxy.zyte.com:8011')
  .action(async (url: string, opts) => {
    const concurrency = parsePositiveInt(opts.concurrency, 'concurrency');
    const timeout = parsePositiveInt(opts.timeout, 'timeout');
    const maxRedirects = parsePositiveInt(opts.maxRedirects, 'max-redirects');
    const delay = parseNonNegativeInt(opts.delay, 'delay');
    const maxRetries = parseNonNegativeInt(opts.maxRetries, 'max-retries');
    const verbose: boolean = opts.verbose ?? false;
    const csvPath: string | undefined = opts.csv
      ? safeCsvPath(opts.csv)
      : undefined;

    // Initialize proxy if ZYTE_API_KEY is set
    const apiKey = process.env.ZYTE_API_KEY;
    if (apiKey) {
      const proxyUrl = typeof opts.proxyUrl === 'string' ? opts.proxyUrl : 'http://proxy.zyte.com:8011';
      initializeProxy(apiKey, proxyUrl);
      console.log(chalk.cyan(`Proxy active: ${proxyUrl}`));
    }

    // Fetch and parse sitemaps
    console.log(chalk.cyan(`Fetching sitemap: ${url}`));
    let sitemaps;
    try {
      sitemaps = await fetchSitemaps(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
      console.error(chalk.red(`Fatal: ${msg}${cause ? `: ${cause}` : ''}`));
      process.exit(1);
    }

    if (sitemaps.length === 0) {
      console.error(chalk.red('No sitemaps found.'));
      process.exit(1);
    }

    const totalUrls = sitemaps.reduce((sum, s) => sum + s.urls.length, 0);
    console.log(
      chalk.cyan(
        `Found ${sitemaps.length} sitemap(s) with ${totalUrls} total URLs`,
      ),
    );
    console.log('');

    // Check URLs for each sitemap
    const reports: SitemapReport[] = [];
    const multiBar = createMultiBar();

    for (const sitemap of sitemaps) {
      const bar = multiBar.create(sitemap.urls.length, 0, {
        sitemap: sitemap.name,
      });

      const results = await checkUrls(
        sitemap,
        concurrency,
        timeout,
        maxRedirects,
        delay,
        maxRetries,
        () => bar.increment(),
        (attempt, count) => {
          console.log(chalk.yellow(`  Retry ${attempt}/${maxRetries}: ${count} URL(s) with retryable errors`));
        },
      );

      bar.stop();
      reports.push({ sitemap, results });
    }

    multiBar.stop();

    // Print report
    printReport(reports, verbose);

    // Write CSV if requested
    if (csvPath) {
      await writeCsvReport(reports, csvPath);
      console.log(chalk.green(`CSV report written to ${csvPath}`));
    }
  });

program.parse();
