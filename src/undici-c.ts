import { inspect, promisify } from 'util';
import * as undici from 'undici';
import { StatusError } from './status-error';
import { lookup } from './dns';
import * as dns from 'dns';
import * as stream from 'stream';
import { createWriteStream } from 'fs';
import { URL } from 'url';

const pipeline = promisify(stream.pipeline);

const config = {
	proxy: undefined as any
};

const clientDefaults: undici.Agent.Options = {
	keepAliveTimeout: 4 * 1000,
	keepAliveMaxTimeout: 10 * 60 * 1000,
	keepAliveTimeoutThreshold: 1 * 1000,
	strictContentLength: true,
	connect: {
		maxCachedSessions: 100,
		lookup: lookup,
	},
};

const nonProxiedAgent = new undici.Agent({
	...clientDefaults,
});

const agent = config.proxy
? new undici.ProxyAgent({
	...clientDefaults,
	uri: config.proxy,
})
: nonProxiedAgent;

function getAgentByUrl(url: URL, bypassProxy = false): undici.Agent | undici.ProxyAgent {
	if (bypassProxy) {
		return nonProxiedAgent;
	} else {
		return agent;
	}
}

const connector = undici.buildConnector({ rejectUnauthorized: false })

async function fetch(url: string) {
	const u = new URL(url);

	const cli = new undici.Client(u.origin, {
		strictContentLength: true,
		headersTimeout: 10 * 1000,
		bodyTimeout: 60 * 1000,
		maxResponseSize: 10 * 1024 * 1024,

		connect: (opts, cb) => {
			console.log('opts 0', opts);
			// host: 'httpbin.org',
			// hostname: 'httpbin.org',

			resolve(opts.host).then(addr => {

				// ここでチェック

				opts.hostname = addr;
				console.log('opts 1', opts);
				// host: 'httpbin.org',
				// hostname: '52.45.51.124',

				connector(opts, (err, socket) => {
					if (err) {
						cb(err, null);
						return;
					}
					console.log(`${socket.localPort} => ${socket.remoteAddress}`);
					// 50968 => 52.45.51.124
					cb(null, socket)
				});
			});
		},
	});

	const response = await cli.request({
		method: 'GET',
		path: u.pathname + `${u.search ? `?${u.search}` : ''}`,
	});

	await pipeline(response.body, createWriteStream('/tmp/123'));
}

async function resolve(host: string): Promise<string> {
	const a = await dns.promises.resolve4(host).catch(() => []);
	if (a?.length > 0) return a[0];
	return await dns.promises.resolve6(host)[0];
}

const args = process.argv.slice(2);
const url = args[0];

fetch(url).catch(e => {
	console.log(inspect(e));
	console.log(`${e}`);
})
