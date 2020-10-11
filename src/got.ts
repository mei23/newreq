import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';

async function main(url: string) {
	const json = await got.post(url, {
		json: {
			a: 'b'
		},
		headers: {
			Accept: '*/*',
			// 'Accept-Encoding': 'gzip, deflate, br', がデフォルト
		},
		responseType: 'json',
		timeout: 5 * 1000,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,	// デフォルトでリトライするようになってる
		throwHttpErrors: false,	// 400以上をエラーにするか
	}).catch((error: any) => {
		// エラーオブジェクトは小さいのでそのままthrowされても大丈夫そう, でもデフォルトだとエラーのステータスコードさくっと取れないかも
		throw `name=${error.name} message=${error.message} type=${error.type} code=${error.code}`;
		// name=RequestError message=ENOTFOUND httpbin.orgx type=undefined code=ENOTFOUND
		// name=TimeoutError message=Timeout awaiting 'request' for 5000ms type=undefined code=ETIMEDOUT
		// name=RequestError message=Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:  type=undefined code=ERR_TLS_CERT_ALTNAME_INVALID
	}).then(res => {
		// 400以上は自動的にエラーになるけど、スタータスを取りたかったら しないでハンドルしたほうが良いかも
		if (res.statusCode >= 300) {
			throw `${res.statusCode} ${res.statusMessage}`;
			// 400 BAD REQUEST
		} else {
			return res.body;
		}
	});

	console.log(inspect(json));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
