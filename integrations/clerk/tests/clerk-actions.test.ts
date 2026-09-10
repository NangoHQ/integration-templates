import { describe, expect, it, vi } from 'vitest';

import createOrganization from '../actions/create-organization.js';
import createUser from '../actions/create-user.js';
import deleteOrganization from '../actions/delete-organization.js';
import deleteUser from '../actions/delete-user.js';
import getOrganization from '../actions/get-organization.js';
import getUser from '../actions/get-user.js';
import listOrganizations from '../actions/list-organizations.js';
import listUsers from '../actions/list-users.js';
import updateOrganization from '../actions/update-organization.js';
import updateUser from '../actions/update-user.js';

const user = { id: 'user_123', object: 'user', first_name: 'Ada', last_name: 'Lovelace' };
const organization = { id: 'org_123', object: 'organization', name: 'Analytical Engines', slug: 'analytical-engines' };

function mockNango(data: unknown = {}) {
    return {
        get: vi.fn().mockResolvedValue({ data }),
        post: vi.fn().mockResolvedValue({ data }),
        patch: vi.fn().mockResolvedValue({ data }),
        delete: vi.fn().mockResolvedValue({ data }),
        ActionError: class extends Error {
            constructor(public payload: unknown) {
                super('Action error');
            }
        }
    } as any;
}

describe('Clerk actions', () => {
    it('lists users with offset cursor pagination', async () => {
        const nango = mockNango({ data: [user], total_count: 2 });
        await expect(listUsers.exec(nango, { cursor: '0', limit: 1, query: 'ada' })).resolves.toEqual({ items: [user], next_cursor: '1', total: 2 });
        expect(nango.get).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/users', params: expect.objectContaining({ offset: '0', limit: '1', query: 'ada' }), retries: 3 })
        );
    });

    it('gets and creates users', async () => {
        const getNango = mockNango(user);
        await expect(getUser.exec(getNango, { user_id: 'user/123' })).resolves.toMatchObject(user);
        expect(getNango.get).toHaveBeenCalledWith({ endpoint: '/v1/users/user%2F123', retries: 3 });
        const createNango = mockNango(user);
        await createUser.exec(createNango, { email_address: ['ada@example.com'], first_name: 'Ada' });
        expect(createNango.post).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/users', data: { email_address: ['ada@example.com'], first_name: 'Ada' }, retries: 3 })
        );
    });

    it('updates and deletes users', async () => {
        const updateNango = mockNango(user);
        await updateUser.exec(updateNango, { user_id: 'user_123', first_name: 'Augusta' });
        expect(updateNango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/users/user_123', data: { first_name: 'Augusta' } }));
        const deleteNango = mockNango();
        await expect(deleteUser.exec(deleteNango, { user_id: 'user_123' })).resolves.toEqual({ id: 'user_123', success: true });
    });

    it('lists organizations with offset cursor pagination', async () => {
        const nango = mockNango({ data: [organization], total_count: 2 });
        await expect(listOrganizations.exec(nango, { cursor: '0', limit: 1 })).resolves.toEqual({ items: [organization], next_cursor: '1', total: 2 });
        expect(nango.get).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/organizations', params: expect.objectContaining({ offset: '0', limit: '1' }), retries: 3 })
        );
    });

    it('gets and creates organizations', async () => {
        const getNango = mockNango(organization);
        await getOrganization.exec(getNango, { organization_id: 'org_123' });
        expect(getNango.get).toHaveBeenCalledWith({ endpoint: '/v1/organizations/org_123', params: {}, retries: 3 });
        const createNango = mockNango(organization);
        await createOrganization.exec(createNango, { name: 'Analytical Engines', slug: 'analytical-engines' });
        expect(createNango.post).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/organizations', data: { name: 'Analytical Engines', slug: 'analytical-engines' } })
        );
    });

    it('updates and deletes organizations', async () => {
        const updateNango = mockNango(organization);
        await updateOrganization.exec(updateNango, { organization_id: 'org_123', name: 'New Name' });
        expect(updateNango.patch).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/organizations/org_123', data: { name: 'New Name' } }));
        const deleteNango = mockNango();
        await expect(deleteOrganization.exec(deleteNango, { organization_id: 'org_123' })).resolves.toEqual({ id: 'org_123', success: true });
    });
});
