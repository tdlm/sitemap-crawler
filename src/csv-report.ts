import { writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import type { SitemapReport } from './types.js';

export async function writeCsvReport(
  reports: SitemapReport[],
  filePath: string,
): Promise<void> {
  const rows: Array<[string, string, number, string]> = [];

  for (const report of reports) {
    for (const result of report.results) {
      rows.push([
        report.sitemap.name,
        result.url,
        result.statusCode,
        result.error ?? '',
      ]);
    }
  }

  const csv = stringify(rows, {
    header: true,
    columns: ['sitemap', 'url', 'status_code', 'error'],
  });

  await writeFile(filePath, csv, 'utf-8');
}
