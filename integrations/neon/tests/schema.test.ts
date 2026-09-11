import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import schema from '../actions/get-branch-schema.js';
import compare from '../actions/compare-branch-schema.js';
const base = { project_id: 'project', branch_id: 'branch', db_name: 'database' };
describe('schema inspection selectors', () => {
    it('rejects competing historical selectors on either side of a comparison', () => {
        const selectors = { lsn: '0/123', timestamp: '2026-09-01T00:00:00Z' };
        expect(schema.input.safeParse({ ...base, ...selectors }).success).toBe(false);
        expect(compare.input.safeParse({ ...base, ...selectors }).success).toBe(false);
        expect(compare.input.safeParse({ ...base, base_lsn: '0/123', base_timestamp: selectors.timestamp }).success).toBe(false);
        expect(schema.input.safeParse({ ...base, timestamp: 'yesterday' }).success).toBe(false);
        expect(schema.input.safeParse({ ...base, format: 'yaml' }).success).toBe(false);
    });
    it('validates known response fields even when the provider omits optional fields', () => {
        expect(schema.output.safeParse({ sql: 123 }).success).toBe(false);
        expect(schema.output.safeParse({ json: { tables: [{ schema: 'public', name: 'items', columns: [{ name: 'id', type: 123 }] }] } }).success).toBe(false);
        expect(compare.output.safeParse({ diff: 123 }).success).toBe(false);
        expect(compare.output.safeParse({ diff: '- old\n+ new' }).success).toBe(true);
    });
    it('requires a database and allows independent historical points', () => {
        expect(schema.input.safeParse({ project_id: 'project', branch_id: 'branch' }).success).toBe(false);
        expect(compare.input.safeParse({ ...base, lsn: '0/123', base_timestamp: '2026-09-01T00:00:00Z' }).success).toBe(true);
    });
    it('forwards database names and historical selectors as query parameters', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-branch-schema', Model: 'Output' });
        nango.get.mockResolvedValue({ data: { sql: 'CREATE TABLE items (id integer);' } });
        await schema.exec(nango, schema.input.parse({ ...base, db_name: 'db & name', lsn: '0/123', format: 'sql' }));
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { db_name: 'db & name', lsn: '0/123', format: 'sql' } }));
    });
});
