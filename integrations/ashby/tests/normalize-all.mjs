import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.json'));

const FAKE_UUID_RE = /^00000000-0000-0000-0000-[0-9a-f]{12}$/;

function normalizeFile(filePath) {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const canonical = new Map(); // fakeUuid → { field: value }

    // Pass 1: for each fake UUID, record ALL fields from the first occurrence (including objects/arrays)
    function collect(obj) {
        if (Array.isArray(obj)) { obj.forEach(collect); return; }
        if (!obj || typeof obj !== 'object') return;
        const id = obj.id;
        if (id && FAKE_UUID_RE.test(id) && !canonical.has(id)) {
            const fields = {};
            for (const [k, v] of Object.entries(obj)) {
                if (k !== 'id') fields[k] = v;
            }
            if (Object.keys(fields).length > 0) canonical.set(id, fields);
        }
        for (const v of Object.values(obj)) collect(v);
    }

    collect(data);

    // Pass 2: apply canonical values, but only when structural types match
    // (never replace an object with a scalar, or object-array with string-array, etc.)
    function typesCompatible(canonVal, currentVal) {
        const aIsArr = Array.isArray(canonVal);
        const bIsArr = Array.isArray(currentVal);
        if (aIsArr !== bIsArr) return false;
        if (aIsArr) {
            // Both arrays: check element types
            const aElem = canonVal.find(x => x !== null) ?? null;
            const bElem = currentVal.find(x => x !== null) ?? null;
            if (aElem === null || bElem === null) return true; // one empty — safe
            return (typeof aElem === 'object') === (typeof bElem === 'object');
        }
        const aIsObj = canonVal !== null && typeof canonVal === 'object';
        const bIsObj = currentVal !== null && typeof currentVal === 'object';
        if (aIsObj !== bIsObj) return false;
        return true;
    }

    function apply(obj) {
        if (Array.isArray(obj)) return obj.map(apply);
        if (!obj || typeof obj !== 'object') return obj;
        const lookupId = [obj.id, obj.userId].find(v => v && FAKE_UUID_RE.test(v));
        const canon = lookupId ? canonical.get(lookupId) : null;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (canon && k in canon && typesCompatible(canon[k], v)) {
                const cv = canon[k];
                out[k] = (cv && typeof cv === 'object') ? apply(cv) : cv;
            } else {
                out[k] = (v && typeof v === 'object') ? apply(v) : v;
            }
        }
        return out;
    }

    const normalized = apply(data);
    writeFileSync(filePath, JSON.stringify(normalized, null, 2));
    return canonical.size;
}

for (const file of files) {
    const count = normalizeFile(join(dir, file));
    console.log(`${file}: ${count} unique entities normalized`);
}
