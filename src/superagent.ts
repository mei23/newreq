import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import * as superagent from 'superagent';

async function main(url: string) {
	const res = await superagent
		.post(url)
		.send({ a: 'b' })
		.set('Accept', '*/*')
		.timeout(3 * 1000)
		.agent(url.startsWith('https:') ? httpsAgent : httpAgent)
		.catch(error => {
			// ステータスエラーとかはそのままthrowされるとちょっと長い
			throw `name=${error.name} message=${error.message} status=${error.status} code=${error.code}`;
			// name=Error message=Not Found status=404 statusCode=404 code='ECONNABORTED'
			// name=Error message=Timeout of 3000ms exceeded status=undefined code='ECONNABORTED'
			// name=Error message=Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:  status=undefined code=ERR_TLS_CERT_ALTNAME_INVALID
			// name=Error message=ENOTFOUND example.comx status=undefined code=ENOTFOUND
		});
	
	// レスポンスパースJSONを強制することが出来ないので、非標準のContent-Typeで返ってくる時はカスタムパーサーが必要

	console.log(inspect(res.body));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
