import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import getOperation from '../actions/get-operation.js';
import listOperations from '../actions/list-operations.js';

describe('operation completion', () => {
    it.each(['scheduling', 'running', 'finished', 'failed', 'cancelling', 'cancelled', 'skipped'] as const)(
        'preserves %s status for callers polling asynchronous work',
        async (status) => {
            const fixture = JSON.parse(readFileSync(new URL('./get-operation.fixture.json', import.meta.url), 'utf8'));
            const nango = new NangoActionMock({ dirname: __dirname, name: 'get-operation', Model: 'Output' });
            nango.get.mockResolvedValue({ data: { operation: { ...fixture.response.operation, status } } });
            const result = await getOperation.exec(nango, getOperation.input.parse(fixture.input));
            expect(result.operation.status).toBe(status);
            expect(nango.get).toHaveBeenCalledOnce();
        }
    );
    it('returns a resumable cursor and terminates at the final page', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-operations', Model: 'Output' });
        nango.get.mockResolvedValueOnce({ data: { operations: [], pagination: { cursor: 'next' } } });
        expect((await listOperations.exec(nango, { project_id: 'project', cursor: 'previous', limit: 1000 })).next_cursor).toBe('next');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { cursor: 'previous', limit: 1000 } }));
        nango.get.mockResolvedValueOnce({ data: { operations: [] } });
        expect((await listOperations.exec(nango, { project_id: 'project' })).next_cursor).toBeUndefined();
    });
    it('rejects invalid operation IDs and page sizes before execution', () => {
        expect(getOperation.input.safeParse({ project_id: 'project', operation_id: 'invalid' }).success).toBe(false);
        expect(listOperations.input.safeParse({ project_id: 'project', limit: 1001 }).success).toBe(false);
    });
});
