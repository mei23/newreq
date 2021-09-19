import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import { getAgentByUrl } from './agent';
import * as http from 'http';
import * as https from 'https';
import { StatusError } from './status-error';

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
				req.destroy(new Error(`maxSize exceeded (${size} > ${maxSize}) on response`));
			}
		}
	}).on('downloadProgress', (progress: Got.Progress) => {
		// https://github.com/sindresorhus/got/blob/f0b7bc5135bc30e50e93c52420dbd862e5b67b26/documentation/examples/advanced-creation.js#L60
		if (progress.transferred > maxSize && progress.percent !== 1) {
			req.destroy(new Error(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`));
		}
	});

	console.log(`pipeline start`);
	try {
		await pipeline(req, fs.createWriteStream(path));
	} catch (e) {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	}
	console.log(`pipeline end`);
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(`error: ${inspect(e)}`);
	console.log(`${e}`);
});
