import * as http from 'http';
import * as https from 'https';
const cache = require('lookup-dns-cache');
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

const config = {
	proxy: undefined as any
};

export const httpAgent = config.proxy
	? new HttpProxyAgent(config.proxy)
	: new http.Agent({
		keepAlive: true,
		keepAliveMsecs: 30 * 1000,
	});

export const httpsAgent = config.proxy
	? new HttpsProxyAgent(config.proxy)
	: new https.Agent({
		keepAlive: true,
		keepAliveMsecs: 30 * 1000,
		lookup: cache.lookup,
	});
