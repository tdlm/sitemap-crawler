import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('undici', () => {
  const MockProxyAgent = vi.fn();
  const mockSetGlobalDispatcher = vi.fn();
  return { ProxyAgent: MockProxyAgent, setGlobalDispatcher: mockSetGlobalDispatcher };
});

import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { initializeProxy } from '../proxy.js';

describe('initializeProxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a ProxyAgent with correct uri and token', () => {
    initializeProxy('my-api-key', 'http://proxy.zyte.com:8011');

    const expectedToken = `Basic ${Buffer.from('my-api-key:').toString('base64')}`;

    expect(ProxyAgent).toHaveBeenCalledWith({
      uri: 'http://proxy.zyte.com:8011',
      token: expectedToken,
    });
  });

  it('calls setGlobalDispatcher with the created agent', () => {
    initializeProxy('my-api-key', 'http://proxy.zyte.com:8011');

    const agentInstance = vi.mocked(ProxyAgent).mock.instances[0];
    expect(setGlobalDispatcher).toHaveBeenCalledWith(agentInstance);
  });

  it('encodes API key with empty password in base64 token', () => {
    initializeProxy('abc123', 'http://localhost:8011');

    const expectedToken = `Basic ${Buffer.from('abc123:').toString('base64')}`;

    expect(ProxyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ token: expectedToken }),
    );
  });
});
