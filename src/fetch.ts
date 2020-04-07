import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import fetch from 'node-fetch';

async function main(url: string) {
	const res = await fetch(url, {
		headers: {
			Accept: '*/*',
		},
		timeout: 3 * 1000,
		agent: u => u.protocol == 'http:' ? httpAgent : httpsAgent,
	}).then(res => {
		// 2xx以外をエラーにしたければハンドルする必要がある
		if (!res.ok) {
			throw `${res.status} ${res.statusText}`;
			// 404 Not Found
		} else {
			return res;
		}
	}).catch((error: any) => {
		throw `name=${error.name} message=${error.message} type=${error.type}`;
		// name=FetchError message=network timeout at: https://example.com:81/ type=request-timeout
		// name=FetchError message=request to https://example.comx/ failed, reason: ENOTFOUND example.comx type=system
		// name=FetchError message=request to https://127.0.0.1/ failed, reason: Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:  type=system
	});

	// エラーはそんなに長くないのでそのままthrowしても大丈夫
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
