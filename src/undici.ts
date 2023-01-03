import { inspect } from 'util';
import * as undici from 'undici';
import { StatusError } from './status-error';
import { lookup } from './dns';

const config = {
	proxy: undefined as any
};

const clientDefaults: undici.Agent.Options = {
	keepAliveTimeout: 4 * 1000,
	keepAliveMaxTimeout: 10 * 60 * 1000,
	keepAliveTimeoutThreshold: 1 * 1000,
	strictContentLength: true,
	/*
	factory: (origin, opts) => {
		console.log(`factory: origin=${origin}, opts=${opts}`);
		return new undici.Pool(origin, opts);
	},
	*/
};

const connector = undici.buildConnector({
	maxCachedSessions: 100,
	lookup: lookup,
	keepAlive: true,
});

const nonProxiedAgent = new undici.Agent({
	...clientDefaults,
	connect: (opts, cb) => {
		console.log('connect');
		connector(opts, (err, socket) => {
			if (err) {
				cb(err, null);
				return;
			}

			// ここでチェック
			console.log(`${socket.localPort} => ${socket.remoteAddress}`);

			if (false) {
				socket.destroy();
				cb(new Error('Invalid ip'), null);
				return;
			}

			cb(null, socket)
		});
	},
});

function getAgentByUrl(url: string, bypassProxy = false): undici.Agent | undici.ProxyAgent {
	const useProxy = !bypassProxy && config.proxy != null;

	if (useProxy) {
		return new undici.ProxyAgent({
			...clientDefaults,
			uri: config.proxy,
		});
	} else {
		return nonProxiedAgent;
	}
}

async function fetch(url: string) {
	const json = await undici.fetch(url, {
		method: 'get',
		//body: JSON.stringify({
		//	a: 'b',
		//}),
		headers: {
			Accept: '*/*',
			'User-Agent': 'Client',
			'Content-Type': 'application/json',
			// 'Accept-Encoding': 'br, gzip, deflate', がデフォルト
		},
		dispatcher: getAgentByUrl(url, false),
	})
	.catch((error: any) => {
		// エラーはそんなに長くないのでそのままthrowしても大丈夫
		throw error;
	})
	.then(res => {
		res.url
		// 2xx以外をエラーにしたければハンドルする必要がある
		if (!res.ok) {
			throw new StatusError(`${res.status} ${res.statusText}`, res.status, res.statusText);
			// 404 Not Found
		} else {
			return res.json();
		}
	});

	console.log(inspect(json));
}

async function main(url: string) {
	await fetch(url);
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
	console.log(`${e}`);
})















/*
const nonProxiedAgent = new undici.Agent({
	...clientDefaults,

	connect: (opts, cb) => {
		console.log('opts 0', opts);
		// host: 'httpbin.org',	SNI serverName とかになる
		// hostname: 'httpbin.org',	こっちに接続する
		// TODO: IPアドレスが指定された場合
		resolve(opts.host).then(addr => {
			// ここでaddrをチェック

			// 接続先IPアドレス固定
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
		}).catch(err => {
			console.log(`err1: ${err}`);
			cb(err, null);
		});
	},

});

async function resolve(host: string): Promise<string> {
	const a = await dns.promises.resolve4(host).catch(() => []);
	if (a?.length > 0) return a[0];
	const aaaa = await dns.promises.resolve6(host);
	if (aaaa?.length > 0) return aaaa[0];
	throw new Error('Resolve failed');
}
*/