import { describe, it, expect, vi } from 'vitest';
import { generateCsv, writeCsvReport } from '../csv-report.js';
import type { SitemapReport } from '../types.js';

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(async () => {}),
}));

const makeReport = (name: string, results: Array<{ url: string; statusCode: number; error?: string }>): SitemapReport => ({
  sitemap: { name, urls: results.map((r) => ({ loc: r.url })) },
  results,
});

describe('generateCsv', () => {
  it('generates CSV for a single report', () => {
    const csv = generateCsv([
      makeReport('https://example.com/sitemap.xml', [
        { url: 'https://example.com/page1', statusCode: 200 },
      ]),
    ]);
    expect(csv).toContain('sitemap,url,status_code,error');
    expect(csv).toContain('https://example.com/sitemap.xml');
    expect(csv).toContain('https://example.com/page1');
    expect(csv).toContain('200');
  });

  it('flattens multiple reports', () => {
    const csv = generateCsv([
      makeReport('sitemap1', [{ url: 'https://a.com', statusCode: 200 }]),
      makeReport('sitemap2', [{ url: 'https://b.com', statusCode: 404 }]),
    ]);
    expect(csv).toContain('sitemap1');
    expect(csv).toContain('sitemap2');
    expect(csv).toContain('https://a.com');
    expect(csv).toContain('https://b.com');
  });

  it('returns header only for empty results', () => {
    const csv = generateCsv([]);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('sitemap,url,status_code,error');
  });
});

describe('writeCsvReport', () => {
  it('calls writeFile with correct path and CSV content', async () => {
    const { writeFile } = await import('node:fs/promises');
    await writeCsvReport(
      [makeReport('test-sitemap', [{ url: 'https://test.com', statusCode: 200 }])],
      '/tmp/report.csv',
    );
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/report.csv',
      expect.stringContaining('test-sitemap'),
      'utf-8',
    );
  });
});
