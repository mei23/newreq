import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import fetch from 'node-fetch';
import { StatusError } from './status-error';

async function main(url: string) {
	const json = await fetch(url, {
		method: 'post',
		body: JSON.stringify({
			a: 'b',
		}),
		headers: {
			Accept: '*/*',
			'Content-Type': 'application/json',
			// 'Accept-Encoding': 'gzip,deflate', がデフォルト
		},
		timeout: 3 * 1000,
		agent: u => u.protocol == 'http:' ? httpAgent : httpsAgent,
	}).catch((error: any) => {
		// エラーはそんなに長くないのでそのままthrowしても大丈夫
		throw `name=${error.name} message=${error.message} type=${error.type} code=${error.code}`;
		// name=FetchError message=network timeout at: https://example.com:81/ type=request-timeout code=ECONNABORTED
		// name=FetchError message=request to https://example.comx/ failed, reason: ENOTFOUND example.comx type=system code=ENOTFOUND
		// name=FetchError message=request to https://127.0.0.1/ failed, reason: Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:  type=system code=ERR_TLS_CERT_ALTNAME_INVALID
	}).then(res => {
		// 2xx以外をエラーにしたければハンドルする必要がある
		if (!res.ok) {
			throw new StatusError(`${res.status} ${res.statusText}`, res.status, res.statusText);
			// 404 Not Found
		} else {
			return res.json();
		}
	});

	console.log(inspect(json));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
	console.log(`${e}`);
})
