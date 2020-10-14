import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import { getAgentByUrl } from './agent';
import * as http from 'http';
import * as https from 'https';

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
		hooks: {
			beforeRequest: [
				options => {
					options.request = (url: URL, opt: http.RequestOptions, callback?: (response: any) => void) => {
						const requestFunc = url.protocol === 'http:' ? http.request : https.request;
						opt.agent = getAgentByUrl(url, false); 
						const clientRequest = requestFunc(url, opt, callback) as http.ClientRequest;
						return clientRequest;
					};
				},
			],
		},
		retry: 0,	// デフォルトでリトライするようになってる
	}).on('response', (res: Got.Response) => {
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
			const statusCode = (e as Got.HTTPError).response.statusCode;
			const statusMessage = (e as Got.HTTPError).response.statusMessage;
			e.name = `StatusError`;
			e.statusCode = statusCode;
			e.message = `${statusCode} ${statusMessage}`;
		}
	});

	await pipeline(req, fs.createWriteStream(path));
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(`error: ${inspect(e)}`);
});
