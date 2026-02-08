import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('undici', () => {
  const MockProxyAgent = vi.fn();
  const mockSetGlobalDispatcher = vi.fn();
  const mockFetch = vi.fn();
  return {
    ProxyAgent: MockProxyAgent,
    setGlobalDispatcher: mockSetGlobalDispatcher,
    fetch: mockFetch,
  };
});

import { ProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from 'undici';
import { initializeProxy } from '../proxy.js';

describe('initializeProxy', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates a ProxyAgent with correct uri and token', () => {
    initializeProxy('my-api-key', 'http://proxy.zyte.com:8011');

    const expectedToken = `Basic ${Buffer.from('my-api-key:').toString('base64')}`;

    expect(ProxyAgent).toHaveBeenCalledWith({
      uri: 'http://proxy.zyte.com:8011',
      token: expectedToken,
      requestTls: { rejectUnauthorized: false },
    });
  });

  it('calls setGlobalDispatcher with the created agent', () => {
    initializeProxy('my-api-key', 'http://proxy.zyte.com:8011');

    const agentInstance = vi.mocked(ProxyAgent).mock.instances[0];
    expect(setGlobalDispatcher).toHaveBeenCalledWith(agentInstance);
  });

  it('replaces globalThis.fetch with undici fetch', () => {
    initializeProxy('my-api-key', 'http://proxy.zyte.com:8011');

    expect(globalThis.fetch).toBe(undiciFetch);
  });

  it('encodes API key with empty password in base64 token', () => {
    initializeProxy('abc123', 'http://localhost:8011');

    const expectedToken = `Basic ${Buffer.from('abc123:').toString('base64')}`;

    expect(ProxyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ token: expectedToken }),
    );
  });
});
