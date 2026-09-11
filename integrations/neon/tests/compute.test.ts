import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import create from '../actions/create-endpoint.js';
import update from '../actions/update-endpoint.js';
import suspend from '../actions/suspend-endpoint.js';
describe('compute lifecycle', () => {
    it('requires a branch and compute type and rejects inverted autoscaling bounds', () => {
        expect(create.input.safeParse({ project_id: 'project', body: { endpoint: {} } }).success).toBe(false);
        expect(
            create.input.safeParse({
                project_id: 'project',
                body: { endpoint: { branch_id: 'branch', type: 'read_only', autoscaling_limit_min_cu: 4, autoscaling_limit_max_cu: 1 } }
            }).success
        ).toBe(false);
        expect(
            update.input.safeParse({
                project_id: 'project',
                endpoint_id: 'endpoint',
                body: { endpoint: { autoscaling_limit_min_cu: 4, autoscaling_limit_max_cu: 1 } }
            }).success
        ).toBe(false);
    });
    it('preserves disabled false and scale-to-zero sentinel values', () => {
        const body = { endpoint: { disabled: false, suspend_timeout_seconds: -1 } };
        expect(update.input.parse({ project_id: 'project', endpoint_id: 'endpoint', body }).body).toEqual(body);
        expect(update.input.safeParse({ project_id: 'project', endpoint_id: 'endpoint', body: { endpoint: { suspend_timeout_seconds: -2 } } }).success).toBe(
            false
        );
    });
    it('suspends with one explicit request and returns asynchronous operation IDs', async () => {
        const fixture = JSON.parse(readFileSync(new URL('./suspend-endpoint.fixture.json', import.meta.url), 'utf8'));
        const nango = new NangoActionMock({ dirname: __dirname, name: 'suspend-endpoint', Model: 'Output' });
        nango.post.mockResolvedValue({ data: fixture.response });
        const result = await suspend.exec(nango, { project_id: 'project', endpoint_id: 'endpoint' });
        expect(result.operations).toEqual(fixture.response.operations);
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v2/projects/project/endpoints/endpoint/suspend', retries: 0 }));
    });
});
