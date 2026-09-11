import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
function fixture(name: string) {
    return JSON.parse(readFileSync(new URL(`./${name}.fixture.json`, import.meta.url), 'utf8'));
}
function mock(name: string) {
    return new NangoActionMock({ dirname: __dirname, name, Model: 'Output' });
}

import projects from '../actions/list-projects.js';
import branches from '../actions/list-branches.js';
import getBranch from '../actions/get-branch.js';
import createBranch from '../actions/create-branch.js';
describe('Neon request and pagination behavior', () => {
    it('uses the project cursor and preserves boolean false and numeric limits', async () => {
        const nango = mock('list-projects');
        nango.get.mockResolvedValue({ data: { projects: [], applications: {}, integrations: {}, pagination: { cursor: 'opaque-project-cursor' } } });
        const result = await projects.exec(nango, projects.input.parse({ cursor: 'previous', limit: 20, recoverable: false }));
        expect(result.next_cursor).toBe('opaque-project-cursor');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { cursor: 'previous', limit: 20, recoverable: 'false' } }));
    });
    it('uses pagination.next for branches and terminates when absent', async () => {
        const nango = mock('list-branches');
        nango.get.mockResolvedValueOnce({ data: { branches: [], annotations: {}, pagination: { next: 'opaque-next', sort_order: 'asc' } } });
        expect((await branches.exec(nango, { project_id: 'project', cursor: 'previous', sort_order: 'asc' })).next_cursor).toBe('opaque-next');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { cursor: 'previous', sort_order: 'asc' } }));
        nango.get.mockResolvedValueOnce({ data: { branches: [], annotations: {}, pagination: {} } });
        expect((await branches.exec(nango, { project_id: 'project' })).next_cursor).toBeUndefined();
    });
    it('encodes path identifiers instead of letting them change the route', async () => {
        const nango = mock('get-branch');
        nango.get.mockResolvedValue({ data: fixture('get-branch').response });
        await getBranch.exec(nango, { project_id: 'project/with space', branch_id: 'branch?#' });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/projects/project%2Fwith%20space/branches/branch%3F%23' }));
    });
    it('does not retry branch creation without provider idempotency', async () => {
        const nango = mock('create-branch');
        const f = fixture('create-branch');
        nango.post.mockResolvedValue({ data: f.response });
        await createBranch.exec(nango, createBranch.input.parse(f.input));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ retries: 0 }));
    });
    it('validates pagination limits', () => {
        expect(projects.input.safeParse({ limit: 401 }).success).toBe(false);
        expect(branches.input.safeParse({ project_id: 'project', limit: 0 }).success).toBe(false);
    });
});
