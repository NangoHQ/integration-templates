import { readFileSync, writeFileSync } from 'fs';

const path = new URL('./applications.test.json', import.meta.url).pathname;
const data = JSON.parse(readFileSync(path, 'utf8'));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{5,}$/;

const uuidMap = new Map();
let uuidCounter = 1;
let nameCounter = 1;
let emailCounter = 1;
let phoneCounter = 1;

function fakeUuid(real) {
    if (!uuidMap.has(real)) {
        const n = uuidCounter++;
        const hex = n.toString(16).padStart(12, '0');
        uuidMap.set(real, `00000000-0000-0000-0000-${hex}`);
    }
    return uuidMap.get(real);
}

function redactValue(key, value, parentKey) {
    if (typeof value !== 'string') return value;
    if (key === 'name') return `Test Candidate ${nameCounter++}`;
    if ((key === 'value' || key === 'email') && EMAIL_RE.test(value)) return `candidate${emailCounter++}@example.com`;
    if ((key === 'value' || key === 'phone') && PHONE_RE.test(value) && !EMAIL_RE.test(value)) return `+1000000${String(phoneCounter++).padStart(4, '0')}`;
    if (UUID_RE.test(value)) return fakeUuid(value);
    return value;
}

function walk(obj, parentKey) {
    if (Array.isArray(obj)) {
        return obj.map(item => walk(item, parentKey));
    }
    if (obj !== null && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = typeof v === 'string' ? redactValue(k, v, parentKey) : walk(v, k);
        }
        return out;
    }
    return obj;
}

const redacted = walk(data, null);
writeFileSync(path, JSON.stringify(redacted, null, 2));
console.log(`Redacted: ${uuidMap.size} unique UUIDs, ${nameCounter - 1} names, ${emailCounter - 1} emails, ${phoneCounter - 1} phone numbers`);
