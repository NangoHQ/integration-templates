// Restores structural damage in api.post sections:
// - primaryEmailAddress/primaryPhoneNumber strings → objects
// - emailAddresses/phoneNumbers string arrays → object arrays
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.json'));

function wrapContact(value) {
    return { isPrimary: true, type: 'Personal', value };
}

function fixNode(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(fixNode);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if ((k === 'primaryEmailAddress' || k === 'primaryPhoneNumber') && typeof v === 'string') {
            out[k] = wrapContact(v);
        } else if ((k === 'emailAddresses' || k === 'phoneNumbers') && Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
            out[k] = v.map((s, i) => ({ isPrimary: i === 0, type: 'Personal', value: s }));
        } else {
            out[k] = fixNode(v);
        }
    }
    return out;
}

let total = 0;
for (const file of files) {
    const filePath = join(dir, file);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!data.api?.post) continue;
    const before = JSON.stringify(data.api.post);
    data.api.post = fixNode(data.api.post);
    if (JSON.stringify(data.api.post) !== before) {
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Fixed: ${file}`);
        total++;
    }
}
console.log(`${total} files repaired`);
