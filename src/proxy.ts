import { fetch as undiciFetch, ProxyAgent, setGlobalDispatcher } from 'undici';

export function initializeProxy(apiKey: string, proxyUrl: string): void {
  const agent = new ProxyAgent({
    uri: proxyUrl,
    token: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    // Zyte SPM terminates TLS on the proxy side, so the certificate
    // presented through the CONNECT tunnel won't chain to a public CA.
    requestTls: { rejectUnauthorized: false },
  });
  setGlobalDispatcher(agent);
  // Node 25+ ships its own fetch that ignores the npm undici dispatcher.
  // Replace global fetch with undici's so the proxy agent is actually used.
  globalThis.fetch = undiciFetch as typeof globalThis.fetch;
}
