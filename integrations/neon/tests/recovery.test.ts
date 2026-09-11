import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import snapshot from '../actions/create-snapshot.js';
import restore from '../actions/restore-branch.js';
import restoreSnapshot from '../actions/restore-snapshot.js';
import schedule from '../actions/set-snapshot-schedule.js';
import update from '../actions/update-snapshot.js';
const base = { project_id: 'project', branch_id: 'branch' };
describe('recovery contracts', () => {
    it('requires a historical point and preserved state when restoring a branch from itself', () => {
        expect(restore.input.safeParse({ ...base, body: { source_branch_id: 'branch' } }).success).toBe(false);
        expect(restore.input.safeParse({ ...base, body: { source_branch_id: 'branch', source_lsn: '0/123' } }).success).toBe(false);
        expect(
            restore.input.safeParse({ ...base, body: { source_branch_id: 'branch', source_lsn: '0/123', preserve_under_name: 'before-restore' } }).success
        ).toBe(true);
        expect(restore.input.safeParse({ ...base, body: { source_branch_id: 'other' } }).success).toBe(true);
    });
    it('rejects competing snapshot and restore time selectors', () => {
        expect(snapshot.input.safeParse({ ...base, lsn: '0/123', timestamp: '2026-09-01T00:00:00Z' }).success).toBe(false);
        expect(
            restore.input.safeParse({ ...base, body: { source_branch_id: 'other', source_lsn: '0/123', source_timestamp: '2026-09-01T00:00:00Z' } }).success
        ).toBe(false);
    });
    it('sends snapshot selectors as query parameters on POST, as required by the API', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./create-snapshot.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-snapshot', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        await snapshot.exec(nango, snapshot.input.parse({ ...base, lsn: '0/123', name: 'before migration', expires_at: '2030-01-01T00:00:00Z' }));
        expect(nango.post).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/v2/projects/project/branches/branch/snapshot',
                params: { lsn: '0/123', name: 'before migration', expires_at: '2030-01-01T00:00:00Z' },
                retries: 0
            })
        );
        expect(nango.post.mock.calls[0]?.[0]).not.toHaveProperty('data');
    });
    it('does not finalize a snapshot restore unless explicitly requested', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./restore-snapshot.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'restore-snapshot', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        await restoreSnapshot.exec(
            nango,
            restoreSnapshot.input.parse({ project_id: 'project', snapshot_id: 'snapshot', body: { name: 'preview', finalize_restore: false } })
        );
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ retries: 0, data: { name: 'preview', finalize_restore: false } }));
        expect(restoreSnapshot.input.safeParse({ project_id: 'project', snapshot_id: 'snapshot' }).success).toBe(true);
    });
    it('validates schedule bounds and preserves explicit expiration removal', () => {
        expect(schedule.input.safeParse({ ...base, body: { schedule: [] } }).success).toBe(false);
        expect(schedule.input.safeParse({ ...base, body: { schedule: [{ frequency: 'daily', hour: 24 }] } }).success).toBe(false);
        expect(schedule.input.safeParse({ ...base, body: { schedule: [{ frequency: 'daily', hour: 0, retention_seconds: 3600 }] } }).success).toBe(true);
        expect(
            update.input.parse({ project_id: 'project', snapshot_id: 'snapshot', body: { snapshot: { expires_at: null } } }).body.snapshot.expires_at
        ).toBeNull();
    });
});
