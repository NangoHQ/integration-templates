import { describe, expect, it, vi } from 'vitest';

import createConnection from '../actions/create-connection.js';
import createInvitation from '../actions/create-invitation.js';
import createOrganizationDomain from '../actions/create-organization-domain.js';
import createOrganizationMembership from '../actions/create-organization-membership.js';
import deactivateOrganizationMembership from '../actions/deactivate-organization-membership.js';
import deleteConnection from '../actions/delete-connection.js';
import deleteDirectory from '../actions/delete-directory.js';
import deleteOrganizationDomain from '../actions/delete-organization-domain.js';
import deleteOrganizationMembership from '../actions/delete-organization-membership.js';
import getConnection from '../actions/get-connection.js';
import getDirectory from '../actions/get-directory.js';
import getDirectoryGroup from '../actions/get-directory-group.js';
import getDirectoryUser from '../actions/get-directory-user.js';
import getInvitation from '../actions/get-invitation.js';
import getOrganizationDomain from '../actions/get-organization-domain.js';
import getOrganizationMembership from '../actions/get-organization-membership.js';
import listConnections from '../actions/list-connections.js';
import listDirectories from '../actions/list-directories.js';
import listEvents from '../actions/list-events.js';
import listInvitations from '../actions/list-invitations.js';
import listOrganizationMembershipGroups from '../actions/list-organization-membership-groups.js';
import listOrganizationMemberships from '../actions/list-organization-memberships.js';
import reactivateOrganizationMembership from '../actions/reactivate-organization-membership.js';
import resendInvitation from '../actions/resend-invitation.js';
import revokeInvitation from '../actions/revoke-invitation.js';
import updateConnection from '../actions/update-connection.js';
import updateOrganizationMembership from '../actions/update-organization-membership.js';
import verifyOrganizationDomain from '../actions/verify-organization-domain.js';

function mockNango(data: unknown = {}) {
    return {
        get: vi.fn().mockResolvedValue({ data }),
        post: vi.fn().mockResolvedValue({ data }),
        put: vi.fn().mockResolvedValue({ data }),
        patch: vi.fn().mockResolvedValue({ data }),
        delete: vi.fn().mockResolvedValue({ data })
    } as any;
}

const now = '2026-09-10T00:00:00.000Z';
const directory = {
    object: 'directory' as const,
    id: 'directory_123',
    domain: 'example.com',
    external_key: 'example',
    name: 'Example',
    organization_id: 'org_123',
    state: 'linked',
    type: 'okta scim v2.0',
    created_at: now,
    updated_at: now
};
const directoryGroup = {
    id: 'directory_group_123',
    idp_id: 'idp_group_123',
    directory_id: 'directory_123',
    organization_id: 'org_123',
    name: 'Engineering',
    created_at: now,
    updated_at: now,
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
    state: 'active' as const,
    raw_attributes: {},
    groups: [directoryGroup],
    created_at: now,
    updated_at: now
};
const membership = {
    object: 'organization_membership' as const,
    id: 'om_123',
    user_id: 'user_123',
    organization_id: 'org_123',
    status: 'active' as const,
    directory_managed: false,
    role: { slug: 'member' },
    roles: [{ slug: 'member' }],
    user: { id: 'user_123' },
    created_at: now,
    updated_at: now
};
const invitation = {
    object: 'invitation' as const,
    id: 'invite_123',
    email: 'ada@example.com',
    state: 'pending' as const,
    accepted_at: null,
    revoked_at: null,
    expires_at: now,
    organization_id: 'org_123',
    inviter_user_id: null,
    accepted_user_id: null,
    role_slug: 'member',
    created_at: now,
    updated_at: now,
    token: 'token_123',
    accept_invitation_url: 'https://example.com/accept'
};
const connection = {
    object: 'connection' as const,
    id: 'conn_123',
    organization_id: 'org_123',
    connection_type: 'OktaSAML',
    name: 'Example',
    state: 'active' as const,
    status: 'linked' as const,
    domains: [{ id: 'domain_123', object: 'connection_domain' as const, domain: 'example.com' }],
    created_at: now,
    updated_at: now
};
const organizationDomain = {
    object: 'organization_domain' as const,
    id: 'org_domain_123',
    organization_id: 'org_123',
    domain: 'example.com',
    state: 'pending' as const,
    verification_strategy: 'dns' as const,
    created_at: now,
    updated_at: now
};
const event = { id: 'event_123', event: 'user.created', created_at: now, data: { id: 'user_123' } };
const page = (data: unknown[], after: string | null = null) => ({ object: 'list', data, list_metadata: { before: null, after } });

describe('WorkOS priority actions', () => {
    it('lists, gets, and deletes directories', async () => {
        const listNango = mockNango(page([directory], 'next_directory'));
        await expect(listDirectories.exec(listNango, { organization_id: 'org_123' })).resolves.toEqual({ items: [directory], next_cursor: 'next_directory' });
        expect(listNango.get).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/directories', params: expect.objectContaining({ organization_id: 'org_123' }) })
        );

        const getNango = mockNango(directory);
        await getDirectory.exec(getNango, { directory_id: 'directory/123' });
        expect(getNango.get).toHaveBeenCalledWith({ endpoint: '/directories/directory%2F123', retries: 3 });

        const deleteNango = mockNango();
        await expect(deleteDirectory.exec(deleteNango, { directory_id: 'directory_123' })).resolves.toEqual({ id: 'directory_123', success: true });
    });

    it('gets directory groups and users', async () => {
        const groupNango = mockNango(directoryGroup);
        await getDirectoryGroup.exec(groupNango, { group_id: 'directory_group/123' });
        expect(groupNango.get).toHaveBeenCalledWith({ endpoint: '/directory_groups/directory_group%2F123', retries: 3 });

        const userNango = mockNango(directoryUser);
        await expect(getDirectoryUser.exec(userNango, { directory_user_id: 'directory_user_123' })).resolves.toEqual(directoryUser);
    });

    it('manages organization memberships', async () => {
        const listNango = mockNango(page([membership], 'next_membership'));
        await expect(listOrganizationMemberships.exec(listNango, { organization_id: 'org_123', statuses: ['active'] })).resolves.toEqual({
            items: [membership],
            next_cursor: 'next_membership'
        });
        expect(listNango.get).toHaveBeenCalledWith(
            expect.objectContaining({ params: expect.objectContaining({ organization_id: 'org_123', statuses: 'active' }) })
        );

        const nango = mockNango(membership);
        await createOrganizationMembership.exec(nango, { user_id: 'user_123', organization_id: 'org_123', role_slug: 'member' });
        await getOrganizationMembership.exec(nango, { membership_id: 'om_123' });
        await updateOrganizationMembership.exec(nango, { membership_id: 'om_123', role_slugs: ['admin', 'member'] });
        await deactivateOrganizationMembership.exec(nango, { membership_id: 'om_123' });
        await reactivateOrganizationMembership.exec(nango, { membership_id: 'om_123' });
        expect(nango.put).toHaveBeenCalledTimes(3);

        const groupsNango = mockNango(page([{ id: 'group_123', name: 'Engineering', organization_id: 'org_123' }]));
        await expect(listOrganizationMembershipGroups.exec(groupsNango, { membership_id: 'om_123' })).resolves.toEqual({
            items: [{ id: 'group_123', name: 'Engineering', organization_id: 'org_123' }]
        });

        const deleteNango = mockNango();
        await expect(deleteOrganizationMembership.exec(deleteNango, { membership_id: 'om_123' })).resolves.toEqual({ id: 'om_123', success: true });
    });

    it('manages user invitations', async () => {
        const listNango = mockNango(page([invitation]));
        await expect(listInvitations.exec(listNango, { email: 'ada@example.com' })).resolves.toEqual({ items: [invitation] });

        const nango = mockNango(invitation);
        await createInvitation.exec(nango, { email: 'ada@example.com', organization_id: 'org_123', role_slug: 'member', expires_in_days: 7 });
        await getInvitation.exec(nango, { invitation_id: 'invite_123' });
        await resendInvitation.exec(nango, { invitation_id: 'invite_123', locale: 'en' });
        await revokeInvitation.exec(nango, { invitation_id: 'invite_123' });
        expect(nango.post).toHaveBeenLastCalledWith(expect.objectContaining({ endpoint: '/user_management/invitations/invite_123/revoke', data: {} }));
    });

    it('manages SSO connections', async () => {
        const listNango = mockNango(page([connection], 'next_connection'));
        await expect(listConnections.exec(listNango, { organization_id: 'org_123' })).resolves.toEqual({ items: [connection], next_cursor: 'next_connection' });

        const nango = mockNango(connection);
        await createConnection.exec(nango, {
            organization_id: 'org_123',
            name: 'Example',
            saml_options: { idp_metadata_url: 'https://idp.example.com/metadata.xml' }
        });
        await getConnection.exec(nango, { connection_id: 'conn/123' });
        await updateConnection.exec(nango, { connection_id: 'conn_123', name: 'Updated', external_id: null });
        expect(nango.patch).toHaveBeenCalledWith({ endpoint: '/connections/conn_123', data: { name: 'Updated', external_id: null }, retries: 3 });

        const deleteNango = mockNango();
        await expect(deleteConnection.exec(deleteNango, { connection_id: 'conn_123' })).resolves.toEqual({ id: 'conn_123', success: true });
    });

    it('manages organization domains', async () => {
        const nango = mockNango(organizationDomain);
        await createOrganizationDomain.exec(nango, { organization_id: 'org_123', domain: 'example.com' });
        await getOrganizationDomain.exec(nango, { organization_domain_id: 'org_domain/123' });
        await verifyOrganizationDomain.exec(nango, { organization_domain_id: 'org_domain_123' });
        expect(nango.post).toHaveBeenLastCalledWith({ endpoint: '/organization_domains/org_domain_123/verify', data: {}, retries: 3 });

        const deleteNango = mockNango();
        await expect(deleteOrganizationDomain.exec(deleteNango, { organization_domain_id: 'org_domain_123' })).resolves.toEqual({
            id: 'org_domain_123',
            success: true
        });
    });

    it('lists events with filters and cursor pagination', async () => {
        const nango = mockNango(page([event], 'next_event'));
        await expect(listEvents.exec(nango, { events: ['user.created'], organization_id: 'org_123', cursor: 'event_100' })).resolves.toEqual({
            items: [event],
            next_cursor: 'next_event'
        });
        expect(nango.get).toHaveBeenCalledWith({
            endpoint: '/events',
            params: { after: 'event_100', events: ['user.created'], organization_id: 'org_123' },
            retries: 3
        });
    });
});
