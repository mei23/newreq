import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import { AbortController } from 'abort-controller';

const pipeline = util.promisify(stream.pipeline);

async function main(url: string, path: string) {
	const controller = new AbortController();
	setTimeout(() => {
		controller.abort();
	}, 3 * 1000);

	const res = await fetch(url, {
		headers: {
			Accept: '*/*',
		},
		timeout: 3 * 1000,
		signal: controller.signal,
		agent: u => u.protocol == 'http:' ? httpAgent : httpsAgent
	});

	if (!res.ok) throw `${res.status} ${res.statusText}`;

	// Content-Lengthがあればとっておく
	const contentLength = res.headers.get('content-length');
	const expectedLength = contentLength != null ? Number(contentLength) : null;

	await pipeline(res.body, fs.createWriteStream(path));

	const actualLength = (await util.promisify(fs.stat)(path)).size;

	if (res.headers.get('accept-encoding') == null && expectedLength != null && expectedLength !== actualLength) {
		throw `size error: expected: ${expectedLength}, but got ${actualLength}`;
	}
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(inspect(e));
})
