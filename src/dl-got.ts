import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import { httpAgent, httpsAgent } from './agent';

const pipeline = util.promisify(stream.pipeline);

async function main(url: string, path: string) {
	const timeout = 5 * 1000;
	const operationTimeout = 10 * 60 * 1000;
	const maxSize = 1 * 1024 * 1024;

	const req = got.stream(url, {
		headers: {
			Accept: '*/*',
		},
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		http2: false,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,	// デフォルトでリトライするようになってる
	}).on('response', (res: Got.Response) => {
		console.log(`httpVersion: ${res.httpVersion}`);
		console.log(`${inspect(res.timings)}`);

		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				console.log(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.destroy();
			}
		}
	}).on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			console.log(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.destroy();
		}
	}).on('error', (e: any) => {
		if (e.name === 'HTTPError') {
			const statusCode = e.response?.statusCode;
			const statusMessage = e.response?.statusMessage;
			e.name = `StatusError`;
			e.statusCode = statusCode;
			e.message = `${statusCode} ${statusMessage}`;
		}
	});

	console.log(`pipeline start`);
	await pipeline(req, fs.createWriteStream(path));
	console.log(`pipeline end`);
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(`error: ${inspect(e)}`);
});
