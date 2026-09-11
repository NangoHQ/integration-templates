import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import create from '../actions/create-role.js';
import remove from '../actions/delete-role.js';
import get from '../actions/get-role.js';
const base = { project_id: 'project', branch_id: 'branch' };
describe('PostgreSQL roles', () => {
    it('enforces the role name byte limit including multibyte names', () => {
        expect(create.input.safeParse({ ...base, body: { role: { name: 'a'.repeat(63) } } }).success).toBe(true);
        expect(create.input.safeParse({ ...base, body: { role: { name: 'a'.repeat(64) } } }).success).toBe(false);
        expect(create.input.safeParse({ ...base, body: { role: { name: 'é'.repeat(32) } } }).success).toBe(false);
    });
    it('preserves no_login and handles a role response without a password', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./create-role.fixture.json', import.meta.url), 'utf8'));
        const response = { ...fixture.response, role: { ...fixture.response.role } };
        delete response.role.password;
        const nango = new NangoActionMock({ dirname: __dirname, name: 'create-role', Model: 'Output' });
        nango.post.mockResolvedValue({ data: response });
        await create.exec(nango, create.input.parse({ ...base, body: { role: { name: 'reader', no_login: true } } }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ retries: 0, data: { role: { name: 'reader', no_login: true } } }));
        expect(get.output.safeParse({ role: response.role }).success).toBe(true);
    });
    it('encodes role names and accepts an already absent role', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'delete-role', Model: 'Output' });
        nango.delete.mockResolvedValue({ data: '', status: 204 });
        await expect(remove.exec(nango, { ...base, role_name: 'reader/with space' })).resolves.toEqual({ deleted: true, already_absent: true });
        expect(nango.delete).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/projects/project/branches/branch/roles/reader%2Fwith%20space' }));
    });
});
