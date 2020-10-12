import * as http from 'http';
import { URL } from 'url';
import * as crypto from 'crypto';
import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';

/**
 * Get AP object with http-signature
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function httpGet(url: string) {
	const timeout = 10 * 1000;

	const { protocol, hostname, port, pathname, search } = new URL(url);

	const buffer: Buffer[] = [];

	return await new Promise((resolve, reject) => {
		const req = http.request({
			agent: httpAgent,
			protocol,
			hostname,
			port,
			method: 'GET',
			path: pathname + search,
			timeout,
			headers: {
				'Accept': 'application/activity+json, application/ld+json',
			}
		});

		req.on('timeout', () => req.abort());

		req.on('error', e => {
			if (req.aborted) reject('timeout');
			reject(e);
		});

		req.on('response', res => {
			if (res.statusCode >= 400) {
				reject(res);
				res.resume();
				return;
			} else {
				res.on('data', data => {
					buffer.push(Buffer.from(data))
				});

				res.on('aborted', () => {
					reject(`aborted`);	// タイムアウトと途中で切れた場合にここに来る
				});

				res.on('error', e => {
					reject(e);	// 来ないはず
				});

				res.on('end', () => {
					try {
						resolve(JSON.parse(buffer.toString()));
					} catch (e) {
						reject(e);
					}
				});
			}
		});

		req.end();
	});
}

const args = process.argv.slice(2);
const url = args[0];

httpGet(url).then(c => {
	console.log(inspect(c));
}).catch(e => {
	console.log(`error ${inspect(e)}`);
})
