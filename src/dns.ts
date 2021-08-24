import * as dns from 'dns';
import CacheableLookup, { IPFamily } from 'cacheable-lookup';
const PrivateIp = require('private-ip');

const cache = new CacheableLookup({
	maxTtl: 3600,	// 1hours
	errorTtl: 30,	// 30secs
	lookup: false,	// Don't fall back to native dns.lookup
});

/**
 * DNS lookup with cache
 */
export const cacheableLookup = cache.lookup;

/**
 * DNS lookup with cache/restrict
 */
export function limitedLookup(hostname: string, options: dns.LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string, family: IPFamily) => void): void {
	if (options.all) {
		throw new Error('options.all: true is unexcepted');
	}

	cacheableLookup(hostname, {
		hints: options.hints,
		family: options.family as IPFamily,
		all: false
	}, (error, address, family) => {
		if (error) {
			callback(error, address, family);
		} else if (PrivateIp(address)) {
			callback(new Error('blocked'), address, family);
		} else {
			callback(error, address, family);
		}
	});
}
