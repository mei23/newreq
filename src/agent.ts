import * as http from 'http';
import * as https from 'https';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { cacheableLookup, limitedLookup } from './dns';

const config = {
	proxy: process.env.NR_Proxy
};

const normalAgentOptions = {
	keepAlive: true,
	keepAliveMsecs: 30 * 1000,
	lookup: cacheableLookup,
} as http.AgentOptions;

const limitedAgentOptions = {
	keepAlive: true,
	keepAliveMsecs: 30 * 1000,
	lookup: limitedLookup,
} as http.AgentOptions;

const proxyAgentOptions = {
	keepAlive: true,
	keepAliveMsecs: 30 * 1000,
	maxSockets: 256,
	maxFreeSockets: 256,
	scheduling: 'lifo' as const,
	proxy: config.proxy!
};

// Agents (without proxy)
const _normalHttp   = new http.Agent(normalAgentOptions);
const _normalhttps  = new https.Agent(normalAgentOptions);
const _limitedHttp  = new http.Agent(limitedAgentOptions);	// with limited DNS lookup
const _limitedHttps = new https.Agent(limitedAgentOptions);	// with limited DNS lookup

// Agents (with proxy)
export const httpAgent = config.proxy
	? new HttpProxyAgent(proxyAgentOptions)
	: _normalHttp;

export const httpsAgent = config.proxy
	? new HttpsProxyAgent(proxyAgentOptions)
	: _normalhttps;

export const limitedHttpAgent = config.proxy
	? new HttpProxyAgent(proxyAgentOptions)
	: _limitedHttp;

export const limitedHttpsAgent = config.proxy
	? new HttpsProxyAgent(proxyAgentOptions)
	: _limitedHttps;

/**
 * Get agent by URL
 * @param url URL
 * @param bypassProxy Allways bypass proxy
 * @param allowPrivate Allow private destination address
 */
export function getAgentByUrl(url: URL, bypassProxy = false, allowPrivate = false): http.Agent | https.Agent {
	const enableLimitedLookup = (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') && !allowPrivate;

	if (bypassProxy) {
		return enableLimitedLookup
			? url.protocol == 'http:' ? _limitedHttp : _limitedHttps
			: url.protocol == 'http:' ? _normalHttp : _normalhttps;
	} else {
		return enableLimitedLookup
			? url.protocol == 'http:' ? limitedHttpAgent : limitedHttpsAgent
			: url.protocol == 'http:' ? httpAgent : httpsAgent;
	}
}