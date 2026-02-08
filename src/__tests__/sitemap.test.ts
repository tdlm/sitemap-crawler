import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gunzipSync } from 'node:zlib';
import { parseUrls, parseSitemap, fetchSitemaps } from '../sitemap.js';

function mockFetch(handler: (url: string) => { body: string; ok?: boolean; status?: number }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const result = handler(url);
    const ok = result.ok ?? true;
    const status = result.status ?? 200;
    return {
      ok,
      status,
      text: async () => result.body,
      arrayBuffer: async () => new TextEncoder().encode(result.body).buffer,
    };
  }));
}

describe('parseUrls', () => {
  it('returns all fields when present', () => {
    const urlset = {
      url: [
        { loc: 'https://example.com/', lastmod: '2024-01-01', changefreq: 'daily', priority: '0.8' },
      ],
    };
    const result = parseUrls(urlset);
    expect(result).toEqual([
      { loc: 'https://example.com/', lastmod: '2024-01-01', changefreq: 'daily', priority: 0.8 },
    ]);
  });

  it('handles missing optional fields', () => {
    const urlset = { url: [{ loc: 'https://example.com/' }] };
    const result = parseUrls(urlset);
    expect(result).toEqual([
      { loc: 'https://example.com/', lastmod: undefined, changefreq: undefined, priority: undefined },
    ]);
  });

  it('converts priority string to number', () => {
    const urlset = { url: [{ loc: 'https://example.com/', priority: '1.0' }] };
    const result = parseUrls(urlset);
    expect(result[0].priority).toBe(1.0);
  });

  it('returns empty array for null/undefined input', () => {
    expect(parseUrls(null)).toEqual([]);
    expect(parseUrls(undefined)).toEqual([]);
  });

  it('returns empty array when urlset has no url property', () => {
    expect(parseUrls({})).toEqual([]);
  });
});

describe('parseSitemap', () => {
  it('parses valid XML with urlset', async () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/a</loc></url>
        <url><loc>https://example.com/b</loc></url>
      </urlset>`;
    const result = await parseSitemap('https://example.com/sitemap.xml', xml);
    expect(result.name).toBe('https://example.com/sitemap.xml');
    expect(result.urls).toHaveLength(2);
    expect(result.urls[0].loc).toBe('https://example.com/a');
  });

  it('throws on missing urlset', async () => {
    const xml = `<?xml version="1.0"?><root></root>`;
    await expect(parseSitemap('https://example.com/sitemap.xml', xml)).rejects.toThrow(
      'No <urlset> found',
    );
  });

  it('handles single-URL sitemap (isArray correctness)', async () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/only</loc></url>
      </urlset>`;
    const result = await parseSitemap('https://example.com/sitemap.xml', xml);
    expect(result.urls).toHaveLength(1);
    expect(result.urls[0].loc).toBe('https://example.com/only');
  });
});

describe('fetchSitemaps', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('fetches a single sitemap', async () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page1</loc></url>
      </urlset>`;
    mockFetch(() => ({ body: xml }));

    const result = await fetchSitemaps('https://example.com/sitemap.xml');
    expect(result).toHaveLength(1);
    expect(result[0].urls[0].loc).toBe('https://example.com/page1');
  });

  it('fetches sitemap index with sub-sitemaps', async () => {
    const indexXml = `<?xml version="1.0"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/sitemap1.xml</loc></sitemap>
        <sitemap><loc>https://example.com/sitemap2.xml</loc></sitemap>
      </sitemapindex>`;
    const subXml = (n: number) => `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page${n}</loc></url>
      </urlset>`;

    mockFetch((url) => {
      if (url.includes('sitemap1')) return { body: subXml(1) };
      if (url.includes('sitemap2')) return { body: subXml(2) };
      return { body: indexXml };
    });

    const result = await fetchSitemaps('https://example.com/sitemap.xml');
    expect(result).toHaveLength(2);
    expect(result[0].urls[0].loc).toBe('https://example.com/page1');
    expect(result[1].urls[0].loc).toBe('https://example.com/page2');
  });

  it('handles sub-sitemap failure with partial results and warning', async () => {
    const indexXml = `<?xml version="1.0"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/good.xml</loc></sitemap>
        <sitemap><loc>https://example.com/bad.xml</loc></sitemap>
      </sitemapindex>`;
    const goodXml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/ok</loc></url>
      </urlset>`;

    mockFetch((url) => {
      if (url.includes('bad.xml')) return { body: '', ok: false, status: 500 };
      if (url.includes('good.xml')) return { body: goodXml };
      return { body: indexXml };
    });

    const result = await fetchSitemaps('https://example.com/sitemap.xml');
    expect(result).toHaveLength(1);
    expect(result[0].urls[0].loc).toBe('https://example.com/ok');
    expect(console.warn).toHaveBeenCalled();
  });

  it('decompresses .xml.gz sitemap', async () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/gz-page</loc></url>
      </urlset>`;
    const { gzipSync } = await import('node:zlib');
    const gzipped = gzipSync(Buffer.from(xml));

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => { throw new Error('should not call text()'); },
      arrayBuffer: async () => gzipped.buffer.slice(gzipped.byteOffset, gzipped.byteOffset + gzipped.byteLength),
    })));

    const result = await fetchSitemaps('https://example.com/sitemap.xml.gz');
    expect(result).toHaveLength(1);
    expect(result[0].urls[0].loc).toBe('https://example.com/gz-page');
  });

  it('throws on invalid XML (no urlset or sitemapindex)', async () => {
    mockFetch(() => ({ body: `<?xml version="1.0"?><nothing></nothing>` }));
    await expect(fetchSitemaps('https://example.com/sitemap.xml')).rejects.toThrow(
      'does not contain a <urlset> or <sitemapindex>',
    );
  });
});
