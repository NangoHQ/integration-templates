import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import project from '../actions/update-project.js';
import branch from '../actions/update-branch.js';
import setDefault from '../actions/set-default-branch.js';
describe('project and branch configuration', () => {
    it('retains zero retention, false protection, and explicit expiry removal', () => {
        expect(project.input.parse({ project_id: 'project', body: { project: { history_retention_seconds: 0 } } }).body.project.history_retention_seconds).toBe(
            0
        );
        expect(
            branch.input.parse({ project_id: 'project', branch_id: 'branch', body: { branch: { protected: false, expires_at: null } } }).body.branch
        ).toEqual({ protected: false, expires_at: null });
        expect(project.input.safeParse({ project_id: 'project', body: { project: { history_retention_seconds: -1 } } }).success).toBe(false);
        expect(branch.input.safeParse({ project_id: 'project', branch_id: 'branch', body: { branch: { name: '' } } }).success).toBe(false);
    });
    it('changes the default branch with one explicit POST and returns its operations', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./set-default-branch.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'set-default-branch', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        const result = await setDefault.exec(nango, { project_id: 'project', branch_id: 'branch' });
        expect(result.operations).toEqual(fixture.response.operations);
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/projects/project/branches/branch/set_as_default', retries: 0 }));
    });
});
