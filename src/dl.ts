import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';

const pipeline = util.promisify(stream.pipeline);

async function main(url: string, path: string) {
	const res = await fetch(url, {
		headers: {
			Accept: '*/*',
		},
		timeout: 3 * 1000,
		agent: u => u.protocol == 'http:' ? httpAgent : httpsAgent
	});

	if (!res.ok) throw `${res.status} ${res.statusText}`;

	await pipeline(res.body, fs.createWriteStream(path));
}

const args = process.argv.slice(2);
const url = args[0];
const path = args[1];

main(url, path).catch(e => {
	console.log(inspect(e));
})
