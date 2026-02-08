import { describe, it, expect, vi, beforeEach } from 'vitest';
import chalk from 'chalk';
import { colorStatus, printReport } from '../output.js';
import type { SitemapReport } from '../types.js';

describe('colorStatus', () => {
  it('returns red "ERR" for code 0', () => {
    expect(colorStatus(0)).toBe(chalk.red('ERR'));
  });

  it('returns green for 2xx codes', () => {
    expect(colorStatus(200)).toBe(chalk.green('200'));
    expect(colorStatus(204)).toBe(chalk.green('204'));
  });

  it('returns yellow for 3xx codes', () => {
    expect(colorStatus(301)).toBe(chalk.yellow('301'));
    expect(colorStatus(304)).toBe(chalk.yellow('304'));
  });

  it('returns red for 4xx codes', () => {
    expect(colorStatus(404)).toBe(chalk.red('404'));
  });

  it('returns red for 5xx codes', () => {
    expect(colorStatus(500)).toBe(chalk.red('500'));
  });
});

describe('printReport', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  const makeReport = (overrides?: Partial<SitemapReport>): SitemapReport => ({
    sitemap: { name: 'https://example.com/sitemap.xml', urls: [] },
    results: [
      { url: 'https://example.com/a', statusCode: 200 },
      { url: 'https://example.com/b', statusCode: 404 },
    ],
    ...overrides,
  });

  it('prints summary with status counts in non-verbose mode', () => {
    printReport([makeReport()], false);
    const output = logSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Total: 2 URLs');
    // Should NOT contain individual URLs
    expect(output).not.toContain('https://example.com/a');
  });

  it('prints each URL in verbose mode', () => {
    printReport([makeReport()], true);
    const output = logSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('https://example.com/a');
    expect(output).toContain('https://example.com/b');
  });
});
