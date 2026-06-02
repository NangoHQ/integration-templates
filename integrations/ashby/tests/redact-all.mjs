import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.json'));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{5,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/; // ISO date — never a phone

function redactFile(filePath) {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));

    const uuidMap = new Map();
    const nameMap = new Map();
    const emailMap = new Map();
    const phoneMap = new Map();
    let uuidCounter = 1;
    let personCounter = 1;
    let phoneCounter = 1;

    function fakeUuid(real) {
        if (!uuidMap.has(real)) {
            const hex = (uuidCounter++).toString(16).padStart(12, '0');
            uuidMap.set(real, `00000000-0000-0000-0000-${hex}`);
        }
        return uuidMap.get(real);
    }

    // Names come in pairs (firstName+lastName) or as a full "name" field.
    // We key full names and derive firstName/lastName from the same person slot.
    function fakePerson(real) {
        if (!nameMap.has(real)) {
            nameMap.set(real, personCounter++);
        }
        return nameMap.get(real);
    }

    function redactValue(key, value) {
        if (typeof value !== 'string') return value;
        if (key === 'name') return `Test User ${fakePerson(value)}`;
        if (key === 'firstName') return 'Test';
        if (key === 'lastName') {
            if (!nameMap.has(value)) nameMap.set(value, personCounter++);
            return `User${nameMap.get(value)}`;
        }
        if (EMAIL_RE.test(value)) {
            if (!emailMap.has(value)) emailMap.set(value, emailMap.size + 1);
            return `user${emailMap.get(value)}@example.com`;
        }
        if (PHONE_RE.test(value) && !EMAIL_RE.test(value) && !UUID_RE.test(value) && !DATE_RE.test(value)) {
            if (!phoneMap.has(value)) phoneMap.set(value, phoneCounter++);
            return `+1000000${String(phoneMap.get(value)).padStart(4, '0')}`;
        }
        if (UUID_RE.test(value)) return fakeUuid(value);
        return value;
    }

    function walk(obj, parentKey) {
        if (Array.isArray(obj)) return obj.map(item =>
            typeof item === 'string' ? redactValue(parentKey, item) : walk(item, parentKey)
        );
        if (obj !== null && typeof obj === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(obj)) {
                out[k] = typeof v === 'string' ? redactValue(k, v) : walk(v, k);
            }
            return out;
        }
        return obj;
    }

    const redacted = walk(data);
    writeFileSync(filePath, JSON.stringify(redacted, null, 2));
    return { uuids: uuidMap.size, names: nameMap.size, emails: emailMap.size, phones: phoneMap.size };
}

for (const file of files) {
    const stats = redactFile(join(dir, file));
    console.log(`${file}: ${stats.uuids} UUIDs, ${stats.names} names, ${stats.emails} emails, ${stats.phones} phones`);
}
