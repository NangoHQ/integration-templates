import { describe, expect, it, vi } from 'vitest';

import createOrganization from '../actions/create-organization.js';
import createUser from '../actions/create-user.js';
import deleteOrganization from '../actions/delete-organization.js';
import deleteUser from '../actions/delete-user.js';
import getOrganization from '../actions/get-organization.js';
import getUser from '../actions/get-user.js';
import listDirectoryGroups from '../actions/list-directory-groups.js';
import listDirectoryUsers from '../actions/list-directory-users.js';
import listOrganizations from '../actions/list-organizations.js';
import listUsers from '../actions/list-users.js';
import updateOrganization from '../actions/update-organization.js';
import updateUser from '../actions/update-user.js';

const user = {
    object: 'user' as const,
    id: 'user_123',
    email: 'ada@example.com',
    email_verified: true,
    profile_picture_url: null,
    name: 'Ada Lovelace',
    first_name: 'Ada',
    last_name: 'Lovelace',
    last_sign_in_at: null,
    locale: null,
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z',
    external_id: null,
    metadata: {}
};
const organization = {
    object: 'organization' as const,
    id: 'org_123',
    name: 'Analytical Engines',
    allow_profiles_outside_organization: false,
    domains: [],
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z',
    external_id: null,
    metadata: {}
};
const directoryGroup = {
    id: 'directory_group_123',
    idp_id: 'idp_group_123',
    directory_id: 'directory_123',
    organization_id: 'org_123',
    name: 'Engineering',
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z',
    raw_attributes: {}
};
const directoryUser = {
    object: 'directory_user' as const,
    id: 'directory_user_123',
    directory_id: 'directory_123',
    organization_id: 'org_123',
    idp_id: 'idp_user_123',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    state: 'active',
    raw_attributes: {},
    custom_attributes: {},
    groups: [directoryGroup],
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z'
};

function mockNango(data: unknown = {}) {
    return {
        get: vi.fn().mockResolvedValue({ data }),
        post: vi.fn().mockResolvedValue({ data }),
        put: vi.fn().mockResolvedValue({ data }),
        delete: vi.fn().mockResolvedValue({ data })
    } as any;
}

describe('WorkOS actions', () => {
    it('lists users with forward cursor pagination', async () => {
        const nango = mockNango({ object: 'list', data: [user], list_metadata: { after: 'next_user', before: null } });
        await expect(listUsers.exec(nango, { cursor: 'current_user', limit: 25, organization_id: 'org_123' })).resolves.toEqual({
            items: [user],
            next_cursor: 'next_user'
        });
        expect(nango.get).toHaveBeenCalledWith({
            endpoint: '/user_management/users',
            params: { after: 'current_user', limit: '25', organization_id: 'org_123' },
            retries: 3
        });
    });

    it('lists organizations with backward cursor pagination', async () => {
        const nango = mockNango({ object: 'list', data: [organization], list_metadata: { after: null, before: 'previous_org' } });
        await expect(listOrganizations.exec(nango, { cursor: 'current_org', cursor_direction: 'before', domains: ['example.com'] })).resolves.toEqual({
            items: [organization],
            next_cursor: 'previous_org'
        });
        expect(nango.get).toHaveBeenCalledWith({
            endpoint: '/organizations',
            params: { before: 'current_org', domains: ['example.com'] },
            retries: 3
        });
    });

    it('gets and creates users', async () => {
        const getNango = mockNango(user);
        await expect(getUser.exec(getNango, { user_id: 'user/123' })).resolves.toEqual(user);
        expect(getNango.get).toHaveBeenCalledWith({ endpoint: '/user_management/users/user%2F123', retries: 3 });

        const createNango = mockNango(user);
        await createUser.exec(createNango, { email: 'ada@example.com', first_name: 'Ada', email_verified: true });
        expect(createNango.post).toHaveBeenCalledWith({
            endpoint: '/user_management/users',
            data: { email: 'ada@example.com', first_name: 'Ada', email_verified: true },
            retries: 3
        });
    });

    it('updates and deletes users', async () => {
        const updateNango = mockNango(user);
        await updateUser.exec(updateNango, { user_id: 'user_123', first_name: 'Augusta', metadata: { title: null } });
        expect(updateNango.put).toHaveBeenCalledWith({
            endpoint: '/user_management/users/user_123',
            data: { first_name: 'Augusta', metadata: { title: null } },
            retries: 3
        });

        const deleteNango = mockNango();
        await expect(deleteUser.exec(deleteNango, { user_id: 'user_123' })).resolves.toEqual({ id: 'user_123', success: true });
        expect(deleteNango.delete).toHaveBeenCalledWith({ endpoint: '/user_management/users/user_123', retries: 3 });
    });

    it('gets and creates organizations', async () => {
        const getNango = mockNango(organization);
        await expect(getOrganization.exec(getNango, { organization_id: 'org/123' })).resolves.toEqual(organization);
        expect(getNango.get).toHaveBeenCalledWith({ endpoint: '/organizations/org%2F123', retries: 3 });

        const createNango = mockNango(organization);
        await createOrganization.exec(createNango, { name: 'Analytical Engines', domain_data: [{ domain: 'example.com', state: 'verified' }] });
        expect(createNango.post).toHaveBeenCalledWith({
            endpoint: '/organizations',
            data: { name: 'Analytical Engines', domain_data: [{ domain: 'example.com', state: 'verified' }] },
            retries: 3
        });
    });

    it('updates and deletes organizations', async () => {
        const updateNango = mockNango(organization);
        await updateOrganization.exec(updateNango, { organization_id: 'org_123', name: 'New Name', external_id: null });
        expect(updateNango.put).toHaveBeenCalledWith({
            endpoint: '/organizations/org_123',
            data: { name: 'New Name', external_id: null },
            retries: 3
        });

        const deleteNango = mockNango();
        await expect(deleteOrganization.exec(deleteNango, { organization_id: 'org_123' })).resolves.toEqual({ id: 'org_123', success: true });
        expect(deleteNango.delete).toHaveBeenCalledWith({ endpoint: '/organizations/org_123', retries: 3 });
    });

    it('lists directory users and groups', async () => {
        const usersNango = mockNango({ object: 'list', data: [directoryUser], list_metadata: { after: 'next_directory_user', before: null } });
        await expect(listDirectoryUsers.exec(usersNango, { directory: 'directory_123' })).resolves.toEqual({
            items: [directoryUser],
            next_cursor: 'next_directory_user'
        });
        expect(usersNango.get).toHaveBeenCalledWith({ endpoint: '/directory_users', params: { directory: 'directory_123' }, retries: 3 });

        const groupsNango = mockNango({ object: 'list', data: [directoryGroup], list_metadata: { after: null, before: null } });
        await expect(listDirectoryGroups.exec(groupsNango, { user: 'directory_user_123' })).resolves.toEqual({ items: [directoryGroup] });
        expect(groupsNango.get).toHaveBeenCalledWith({ endpoint: '/directory_groups', params: { user: 'directory_user_123' }, retries: 3 });
    });
});
