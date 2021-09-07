import { getAgentByUrl, httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as http from 'http';
import * as https from 'https';
import { StatusError } from './status-error';

async function main(url: string) {
	const timeout = 5 * 1000;
	const maxSize = 1 ;

	const req = got.post<any>(url, {
		json: {
			a: 'b'
		},
		headers: {
			Accept: '*/*',
			// 'Accept-Encoding': 'gzip, deflate, br', がデフォルト
		},
		responseType: 'json',
		timeout,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		http2: false,
		retry: 0,	// デフォルトでリトライするようになってる
	});
	
	const res = await receiveResponce(req, maxSize);

	console.log(inspect(res.body));
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
		if (progress.transferred > maxSize) {
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
