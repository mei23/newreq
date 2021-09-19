import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import { StatusError } from './status-error';

async function main(url: string) {
	const json = await getJson(url);
	console.log(inspect(json));
}

const RESPONSE_TIMEOUT = 30 * 1000;
const OPERATION_TIMEOUT = 60 * 1000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

export async function getJson(url: string, accept = 'application/json, */*'): Promise<any> {
	const res = await getResponse({
		url,
		method: 'GET',
		headers: {
			Accept: accept
		},
		timeout: 10 * 1000,
	});

	return await JSON.parse(res.body);
}

export async function getHtml(url: string, accept = 'text/html, */*'): Promise<string> {
	const res = await getResponse({
		url,
		method: 'GET',
		headers: {
			Accept: accept
		},
		timeout: 10 * 1000,
	});

	return await res.body;
}

export async function getResponse(args: { url: string, method: 'GET' | 'POST', body?: string, headers: Record<string, string>, timeout?: number, size?: number }) {
	const timeout = args.timeout || RESPONSE_TIMEOUT;
	const operationTimeout = args.timeout ? args.timeout * 6 : OPERATION_TIMEOUT;

	const req = got<string>(args.url, {
		method: args.method,
		headers: args.headers,
		body: args.body,
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		http2: false,
		retry: 0,
	});

	return await receiveResponce(req, args.size || MAX_RESPONSE_SIZE);
}

/**
 * Receive response (with size limit)
 * @param req Request
 * @param maxSize size limit
 */
async function receiveResponce<T>(req: Got.CancelableRequest<Got.Response<T>>, maxSize: number) {
	// 応答ヘッダでサイズチェック
	req.on('response', (res: Got.Response) => {
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				req.cancel(`maxSize exceeded (${size} > ${maxSize}) on response`);
			}
		}
	});
	
	// 受信中のデータでサイズチェック
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize && progress.percent !== 1) {
			req.cancel(`maxSize exceeded (${progress.transferred} > ${maxSize}) on response`);
		}
	});

	// 応答取得 with ステータスコードエラーの整形
	const res = await req.catch(e => {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	});

	return res;
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
	console.log(`${e}`);
})
