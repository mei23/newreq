
import { httpsAgent, httpAgent } from './agent';
import { inspect } from 'util';
import * as request from 'request-promise-native';

async function main(url: string) {

	const json = await request.post({
		url,
		timeout: 5 * 1000,
		headers: {
			Accept: '*/*'
		},
		json: { a: 'b' },
		agent: url.startsWith('https:') ? httpsAgent : httpAgent,
	}).catch(error => {
		// エラーはそのままthrowされると長ったらしいのが返ってくる
		// error.messageはbodyが大量にくっついてきたりして (応答がバイナリでも！, たぶん5xxのとき？) 大変なことになるので要注意, statusCodeが取れた場合はmessageは捨てたほうがいい

		throw `name=${error.name} code=${error.code} message=${error.message} statusCode=${error.response?.statusCode} statusMessage=${error.response?.statusMessage}`;
		// name=StatusCodeError code=undefined message=404 - undefined statusCode=404 statusMessage=NOT FOUND
		// name=RequestError code=undefined message=Error: ETIMEDOUT statusCode=undefined statusMessage=undefined
		// name=RequestError code=undefined message=Error [ERR_TLS_CERT_ALTNAME_INVALID]: Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:  statusCode=undefined statusMessage=undefined
		// name=RequestError code=undefined message=Error: ENOTFOUND example.comx statusCode=undefined statusMessage=undefined
	});

	console.log(inspect(json));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e, null, 2));
})
