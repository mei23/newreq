import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';

async function main(url: string) {
	const timeout = 5 * 1000;
	const maxSize = 1 * 1024 * 1024;

	const req = got.post(url, {
		json: {
			a: 'b'
		},
		headers: {
			Accept: '*/*',
			// 'Accept-Encoding': 'gzip, deflate, br', がデフォルト
		},
		responseType: 'json',
		timeout,
		http2: false,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,	// デフォルトでリトライするようになってる
	});
	
	req.on('response', (res: Got.Response) => {
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				console.log(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.cancel();
			}
		}
	});
	
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			console.log(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.cancel();
		}
	});

	const res = await req.catch(e => {
		if (e.name === 'HTTPError') {
			const statusCode = (e as Got.HTTPError).response.statusCode;
			const statusMessage = (e as Got.HTTPError).response.statusMessage;
			throw {
				name: `StatusError`,
				statusCode,
				message: `${statusCode} ${statusMessage}`,
			};
		} else {
			throw e;
		}
	});

	console.log(inspect(res.body));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
