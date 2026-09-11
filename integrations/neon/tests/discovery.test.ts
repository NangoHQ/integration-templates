import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import regions from '../actions/list-regions.js';
import shared from '../actions/list-shared-projects.js';
import auth from '../actions/get-auth-details.js';
describe('discovery and access context', () => {
    it('filters region availability by organization', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-regions', Model: 'Output' });
        nango.get.mockResolvedValue({ data: { regions: [] } });
        await regions.exec(nango, { org_id: 'org-example' });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { org_id: 'org-example' } }));
    });
    it('preserves partial shared-project results and pagination', async () => {
        const nango = new NangoActionMock({ dirname: __dirname, name: 'list-shared-projects', Model: 'Output' });
        nango.get.mockResolvedValue({
            data: { projects: [], applications: {}, integrations: {}, unavailable: ['project-loading'], pagination: { cursor: 'next' } }
        });
        const output = await shared.exec(nango, { timeout: 100, cursor: 'previous', search: 'team & project' });
        expect(output.unavailable).toEqual(['project-loading']);
        expect(output.next_cursor).toBe('next');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { timeout: 100, cursor: 'previous', search: 'team & project' } }));
    });
    it('distinguishes user and organization API keys', () => {
        for (const auth_method of ['api_key_user', 'api_key_org']) {
            expect(auth.output.safeParse({ account_id: 'account', auth_method }).success).toBe(true);
        }
    });
});
