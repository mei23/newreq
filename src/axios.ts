import axios, { AxiosError } from 'axios';
import { httpsAgent, httpAgent } from './agent';
import { inspect } from 'util';

async function main(url: string) {
	// これがないと繋がらないホストがConnectionTimeoutしない
	let source = axios.CancelToken.source();
	setTimeout(() => {
		source.cancel();
	}, 5000);

	const res = await axios.post(url, {
			a: 'b',
		},{
			headers: {
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate'	// 設定してくれてない
			},
			
			timeout: 3 * 1000,	// これは応答待ちにしか効かない
			cancelToken: source.token,
			responseType: 'json',
			httpAgent: httpAgent,
			httpsAgent: httpsAgent,
	}).catch((error: AxiosError) => {
		// 2xx以外はエラーになるがそのままthrowするととっても長い
		if (error.response) {
			throw `name=${error.name} code=${error.code} message=${error.message} / ${error.response.status} ${error.response.statusText}`;
			// name=Error code=undefined message=Request failed with status code 400 / 400 BAD REQUEST
		}
		
		// それ以外のエラーもそのままだととっても長い
		if (error.request) {
			throw `name=${error.name} code=${error.code} message=${error.message}`;
			// name=Error code=ENOTFOUND message=ENOTFOUND example.comx
			// name=Error code=ERR_TLS_CERT_ALTNAME_INVALID message=Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list: 
			// name=Error code=ECONNABORTED message=timeout of 3000ms exceeded
		}

		if (axios.isCancel) {
			throw 'Connection Timeout';	// ConnectionTimeoutがここにかかる
		}

		throw error.message;
	});

	console.log(inspect(res.data));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e, null, 2));
})
