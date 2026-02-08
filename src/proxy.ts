import { ProxyAgent, setGlobalDispatcher } from 'undici';

export function initializeProxy(apiKey: string, proxyUrl: string): void {
  const agent = new ProxyAgent({
    uri: proxyUrl,
    token: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
  });
  setGlobalDispatcher(agent);
}
