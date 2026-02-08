import chalk from 'chalk';
import cliProgress from 'cli-progress';
import type { SitemapReport } from './types.js';

export function createMultiBar() {
  return new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: ' {bar} | {percentage}% | {value}/{total} URLs | {sitemap}',
    },
    cliProgress.Presets.shades_grey,
  );
}

function colorStatus(code: number): string {
  if (code === 0) return chalk.red('ERR');
  if (code >= 200 && code < 300) return chalk.green(String(code));
  if (code >= 300 && code < 400) return chalk.yellow(String(code));
  return chalk.red(String(code));
}

export function printReport(reports: SitemapReport[], verbose: boolean): void {
  console.log('');
  console.log(chalk.bold('=== Crawl Results ==='));
  console.log('');

  for (const report of reports) {
    const { sitemap, results } = report;
    console.log(chalk.bold.underline(sitemap.name));

    if (verbose) {
      for (const r of results) {
        const status = colorStatus(r.statusCode);
        const errorSuffix = r.error ? chalk.dim(` (${r.error})`) : '';
        console.log(`  ${status}  ${r.url}${errorSuffix}`);
      }
      console.log('');
    }

    // Status code summary
    const counts = new Map<number, number>();
    for (const r of results) {
      counts.set(r.statusCode, (counts.get(r.statusCode) ?? 0) + 1);
    }

    const sortedCodes = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    const parts = sortedCodes.map(
      ([code, count]) => `${colorStatus(code)}: ${count}`,
    );
    console.log(`  Total: ${results.length} URLs — ${parts.join(', ')}`);
    console.log('');
  }
}
