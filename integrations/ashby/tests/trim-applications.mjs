import { readFileSync, writeFileSync } from 'fs';

const path = new URL('./applications.test.json', import.meta.url).pathname;
const data = JSON.parse(readFileSync(path, 'utf8'));

let changed = false;

const batchSave = data?.nango?.batchSave;
if (batchSave?.Application && Array.isArray(batchSave.Application)) {
    const before = batchSave.Application.length;
    batchSave.Application = batchSave.Application.slice(0, 20);
    console.log(`Trimmed nango.batchSave.Application from ${before} → 20`);
    changed = true;
} else {
    console.warn('Could not find nango.batchSave.Application array');
}

const postEntries = data?.api?.post;
if (postEntries) {
    for (const [route, calls] of Object.entries(postEntries)) {
        if (!Array.isArray(calls)) continue;
        const before = calls.length;
        postEntries[route] = calls.slice(0, 2);
        console.log(`Trimmed api.post["${route}"] from ${before} → ${postEntries[route].length} paginated calls`);
        changed = true;
    }
}

const batchCount = data?.nango?.batchSave?.Application?.length ?? 0;
const calls = data?.api?.post?.['/application.list'] ?? [];
const totalResults = calls.reduce((sum, c) => sum + (c?.response?.results?.length ?? 0), 0);

console.log(`\nbatchSave.Application: ${batchCount}, total api results: ${totalResults}`);

if (totalResults !== batchCount) {
    console.log(`Mismatch — trimming api results to match batchSave count (${batchCount})`);
    let remaining = batchCount;
    for (const call of calls) {
        if (!Array.isArray(call?.response?.results)) continue;
        const take = Math.min(remaining, call.response.results.length);
        call.response.results = call.response.results.slice(0, take);
        remaining -= take;
        if (remaining <= 0) {
            // zero out any further calls
            const idx = calls.indexOf(call);
            for (let i = idx + 1; i < calls.length; i++) {
                if (calls[i]?.response?.results) calls[i].response.results = [];
            }
            break;
        }
    }
    changed = true;
    const newTotal = calls.reduce((sum, c) => sum + (c?.response?.results?.length ?? 0), 0);
    console.log(`After trim — total api results: ${newTotal}`);
} else {
    console.log('Counts match — no further trimming needed');
}

if (changed) {
    writeFileSync(path, JSON.stringify(data, null, 2));
} else {
    console.error('Nothing to trim');
    process.exit(1);
}
