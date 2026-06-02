import { readFileSync, writeFileSync } from 'fs';

const path = new URL('./list-applications.test.json', import.meta.url).pathname;
const data = JSON.parse(readFileSync(path, 'utf8'));

let changed = false;

// Trim top-level items array
if (Array.isArray(data?.nango?.batchSave?.Application)) {
    const before = data.nango.batchSave.Application.length;
    data.nango.batchSave.Application = data.nango.batchSave.Application.slice(0, 20);
    console.log(`nango.batchSave.Application: ${before} → 20`);
    changed = true;
}

// Trim items array (wherever it lives at top level of response)
function trimItems(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) return;
    for (const [k, v] of Object.entries(obj)) {
        if (k === 'items' && Array.isArray(v)) {
            const before = v.length;
            obj[k] = v.slice(0, 20);
            console.log(`${path}.items: ${before} → 20`);
            changed = true;
        } else if (k === 'results' && Array.isArray(v)) {
            const before = v.length;
            obj[k] = v.slice(0, 20);
            console.log(`${path}.results: ${before} → 20`);
            changed = true;
        } else {
            trimItems(v, `${path}.${k}`);
        }
    }
}

trimItems(data);

if (changed) {
    writeFileSync(path, JSON.stringify(data, null, 2));
    console.log('Saved.');
} else {
    console.log('Nothing to trim.');
}
