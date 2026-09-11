import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import logs from '../actions/query-branch-logs.js';
import fields from '../actions/list-branch-log-field-values.js';
import projects from '../actions/get-project-consumption.js';
import branches from '../actions/get-branch-consumption.js';
const base = { project_id: 'project', branch_id: 'branch' };
const period = { org_id: 'org', from: '2026-09-01T00:00:00Z', to: '2026-09-02T00:00:00Z', granularity: 'daily' };
describe('diagnostics contracts', () => {
    it('rejects conflicting log filters and time windows', () => {
        expect(logs.input.safeParse({ ...base, body: { source: 'pg_endpoint' } }).success).toBe(true);
        expect(logs.input.safeParse({ ...base, body: { logql: '{source="pg_endpoint"}' } }).success).toBe(true);
        expect(logs.input.safeParse({ ...base, body: { logql: '{source="compute"}', source: 'pg_endpoint' } }).success).toBe(false);
        expect(logs.input.safeParse({ ...base, body: { since: '1h', start_time: period.from } }).success).toBe(false);
        expect(fields.input.safeParse({ ...base, field_name: 'service_name', since: '1h', start_time: period.from }).success).toBe(false);
        expect(logs.input.safeParse({ ...base, body: { logql: '{source="compute"}', since: '1h', limit: 10, sort_order: 'asc' } }).success).toBe(true);
        expect(logs.input.safeParse({ ...base, body: { trace_id: 'ABC' } }).success).toBe(false);
    });
    it('preserves log cursors and repeats the original filters in the next request body', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'query-branch-logs', Model: 'Output' });
        nango.post.mockResolvedValue({ data: { logs: [], is_truncated: true, next_cursor: 'next' } });
        const body = { start_time: period.from, end_time: period.to, body_contains: 'timeout', cursor: 'previous' };
        const result = await logs.exec(nango, logs.input.parse({ ...base, body }));
        expect(result.next_cursor).toBe('next');
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: body }));
    });
    it('requires metrics and limits branch consumption to its supported metrics and projects', () => {
        expect(projects.input.safeParse({ ...period, metrics: [] }).success).toBe(false);
        expect(branches.input.safeParse({ ...period, project_ids: [], metrics: ['compute_unit_seconds'] }).success).toBe(false);
        expect(branches.input.safeParse({ ...period, project_ids: ['project'], metrics: ['snapshot_storage_bytes_month'] }).success).toBe(false);
        expect(projects.input.safeParse({ ...period, metrics: ['snapshot_storage_bytes_month'] }).success).toBe(true);
        expect(projects.input.safeParse({ ...period, from: period.to, to: period.from, metrics: ['compute_unit_seconds'] }).success).toBe(false);
    });
    it('counts individual nonempty IDs in consumption filters', () => {
        const base = { ...period, metrics: ['compute_unit_seconds'] };
        expect(branches.input.safeParse({ ...base, project_ids: [''] }).success).toBe(false);
        expect(branches.input.safeParse({ ...base, project_ids: ['a,b'] }).success).toBe(false);
        expect(branches.input.safeParse({ ...base, project_ids: Array(101).fill('project') }).success).toBe(false);
        expect(projects.input.safeParse({ ...base, project_ids: ['a,b'] }).success).toBe(false);
        expect(branches.input.safeParse({ ...base, project_ids: ['project'], branch_ids: [''] }).success).toBe(false);
    });
    it('serializes consumption arrays in the documented comma-separated form and retains the cursor', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'get-branch-consumption', Model: 'Output' });
        nango.get.mockResolvedValue({ data: { branches: [], pagination: { cursor: 'next' } } });
        const result = await branches.exec(
            nango,
            branches.input.parse({
                ...period,
                project_ids: ['project-a', 'project-b'],
                branch_ids: ['branch-a'],
                metrics: ['compute_unit_seconds', 'public_network_transfer_bytes'],
                cursor: 'previous'
            })
        );
        expect(result.next_cursor).toBe('next');
        expect(nango.get).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    project_ids: 'project-a,project-b',
                    branch_ids: 'branch-a',
                    metrics: 'compute_unit_seconds,public_network_transfer_bytes',
                    cursor: 'previous'
                })
            })
        );
    });
});
