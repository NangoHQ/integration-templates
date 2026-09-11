import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import create from '../actions/create-database.js';
import update from '../actions/update-database.js';
import deleteDatabase from '../actions/delete-database.js';
import deleteEndpoint from '../actions/delete-endpoint.js';
describe('database lifecycle', () => {
    it('requires the owner when creating a database', () => {
        expect(create.input.safeParse({ project_id: 'project', branch_id: 'branch', body: { database: { name: 'db' } } }).success).toBe(false);
    });
    it('encodes the existing database name separately from the rename payload', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./update-database.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'update-database', Model: 'Output' });
        nango.patch.mockResolvedValue({ data: fixture.response });
        await update.exec(
            nango,
            update.input.parse({
                project_id: 'project',
                branch_id: 'branch',
                database_name: 'old/db?#',
                body: { database: { name: 'new', owner_name: 'owner' } }
            })
        );
        expect(nango.patch).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/v2/projects/project/branches/branch/databases/old%2Fdb%3F%23',
                data: { database: { name: 'new', owner_name: 'owner' } }
            })
        );
    });
    it('treats HTTP 204 as an already absent database or compute, but rejects malformed HTTP 200', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'delete-database', Model: 'Output' });
        const databaseInput = { project_id: 'project', branch_id: 'branch', database_name: 'db' };
        nango.delete.mockResolvedValue({ data: '', status: 204 });
        await expect(deleteDatabase.exec(nango, databaseInput)).resolves.toEqual({ deleted: true, already_absent: true });
        await expect(deleteEndpoint.exec(nango, { project_id: 'project', endpoint_id: 'endpoint' })).resolves.toEqual({ deleted: true, already_absent: true });
        nango.delete.mockResolvedValue({ data: null, status: 200 });
        await expect(deleteDatabase.exec(nango, databaseInput)).rejects.toThrow();
    });
});
