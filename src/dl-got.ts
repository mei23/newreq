import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';

const pipeline = util.promisify(stream.pipeline);

async function main(url: string, path: string) {
	const req = await got.stream(url, {
		headers: {
			Accept: '*/*',
		},
		timeout: 5 * 1000,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,	// デフォルトでリトライするようになってる
	});

	req.on('error', e => {
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

	await pipeline(req, fs.createWriteStream(path));
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(`error: ${inspect(e)}`);
});
