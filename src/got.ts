import { getAgentByUrl } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as http from 'http';
import * as https from 'https';

async function main(url: string) {
	const timeout = 5 * 1000;
	const maxSize = 1 * 1024 * 1024;

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
		http2: false,
		hooks: {
			beforeRequest: [ beforeRequestHook ],
		},
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
				console.log(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.cancel();
			}
		}
	});
	
	// 受信中のデータでサイズチェック
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			console.log(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.cancel();
		}
	});

	// 応答取得 with ステータスコードエラーの整形
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

	return res;
}

/**
 * agent を URL から設定する beforeRequest hook
 */
function beforeRequestHook(options: Got.NormalizedOptions) {
	options.request = (url: URL, opt: http.RequestOptions, callback?: (response: any) => void) => {
		const requestFunc = url.protocol === 'http:' ? http.request : https.request;
		opt.agent = getAgentByUrl(url, false);
		const clientRequest = requestFunc(url, opt, callback) as http.ClientRequest;
		return clientRequest;
	};
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
