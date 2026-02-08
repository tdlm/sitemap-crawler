import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRedirects, checkUrl, checkUrls } from '../checker.js';

function mockFetchSequence(responses: Array<{ status: number; headers?: Record<string, string> }>) {
  const calls = [...responses];
  vi.stubGlobal('fetch', vi.fn(async () => {
    const resp = calls.shift()!;
    return {
      status: resp.status,
      headers: new Headers(resp.headers ?? {}),
    };
  }));
}

function mockFetchByUrl(handler: (url: string, init: any) => { status: number; headers?: Record<string, string> }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    const resp = handler(url, init);
    return {
      status: resp.status,
      headers: new Headers(resp.headers ?? {}),
    };
  }));
}

describe('fetchWithRedirects', () => {
  it('returns status for non-redirect response', async () => {
    mockFetchSequence([{ status: 200 }]);
    const result = await fetchWithRedirects('https://example.com', 'GET', 5000, 5);
    expect(result.status).toBe(200);
  });

  it('follows a single redirect', async () => {
    mockFetchSequence([
      { status: 301, headers: { location: 'https://example.com/new' } },
      { status: 200 },
    ]);
    const result = await fetchWithRedirects('https://example.com', 'GET', 5000, 5);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('follows multi-hop redirects', async () => {
    mockFetchSequence([
      { status: 302, headers: { location: 'https://example.com/hop1' } },
      { status: 302, headers: { location: 'https://example.com/hop2' } },
      { status: 200 },
    ]);
    const result = await fetchWithRedirects('https://example.com', 'GET', 5000, 5);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('stops after maxRedirects exceeded', async () => {
    mockFetchSequence([
      { status: 301, headers: { location: 'https://example.com/a' } },
      { status: 301, headers: { location: 'https://example.com/b' } },
    ]);
    const result = await fetchWithRedirects('https://example.com', 'GET', 5000, 1);
    expect(result.status).toBe(301);
  });

  it('resolves relative redirect URLs', async () => {
    mockFetchSequence([
      { status: 301, headers: { location: '/new-path' } },
      { status: 200 },
    ]);
    await fetchWithRedirects('https://example.com/old', 'GET', 5000, 5);
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondCallUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(secondCallUrl).toBe('https://example.com/new-path');
  });
});

describe('checkUrl', () => {
  it('returns HEAD result on success', async () => {
    mockFetchByUrl(() => ({ status: 200 }));
    const result = await checkUrl('https://example.com', 5000, 5);
    expect(result).toEqual({ url: 'https://example.com', statusCode: 200 });
  });

  it('falls back to GET on 405', async () => {
    mockFetchByUrl((_url, init) => {
      if (init.method === 'HEAD') return { status: 405 };
      return { status: 200 };
    });
    const result = await checkUrl('https://example.com', 5000, 5);
    expect(result.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to GET on 403', async () => {
    mockFetchByUrl((_url, init) => {
      if (init.method === 'HEAD') return { status: 403 };
      return { status: 200 };
    });
    const result = await checkUrl('https://example.com', 5000, 5);
    expect(result.statusCode).toBe(200);
  });

  it('returns statusCode 0 on network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    const result = await checkUrl('https://example.com', 5000, 5);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('ECONNREFUSED');
  });
});

describe('checkUrls', () => {
  it('processes all URLs and calls onProgress per URL', async () => {
    mockFetchByUrl(() => ({ status: 200 }));
    const onProgress = vi.fn();
    const sitemap = {
      name: 'test',
      urls: [
        { loc: 'https://example.com/a' },
        { loc: 'https://example.com/b' },
        { loc: 'https://example.com/c' },
      ],
    };

    const results = await checkUrls(sitemap, 2, 5000, 5, onProgress);
    expect(results).toHaveLength(3);
    expect(onProgress).toHaveBeenCalledTimes(3);
    for (const r of results) {
      expect(r.statusCode).toBe(200);
    }
  });
});
