import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';

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
	}).catch((e: any) => {
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

	console.log(inspect(json));
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
})
