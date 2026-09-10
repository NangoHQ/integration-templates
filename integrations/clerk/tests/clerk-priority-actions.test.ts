import { describe, expect, it, vi } from 'vitest';

import assignOrganizationRolePermission from '../actions/assign-organization-role-permission.js';
import createEmailAddress from '../actions/create-email-address.js';
import createOrganizationDomain from '../actions/create-organization-domain.js';
import createOrganizationInvitation from '../actions/create-organization-invitation.js';
import createOrganizationMembership from '../actions/create-organization-membership.js';
import createOrganizationRole from '../actions/create-organization-role.js';
import createPhoneNumber from '../actions/create-phone-number.js';
import deleteEmailAddress from '../actions/delete-email-address.js';
import deleteOrganizationDomain from '../actions/delete-organization-domain.js';
import deleteOrganizationMembership from '../actions/delete-organization-membership.js';
import deleteOrganizationRole from '../actions/delete-organization-role.js';
import deletePhoneNumber from '../actions/delete-phone-number.js';
import getEmailAddress from '../actions/get-email-address.js';
import getOrganizationInvitation from '../actions/get-organization-invitation.js';
import getOrganizationRole from '../actions/get-organization-role.js';
import getPhoneNumber from '../actions/get-phone-number.js';
import getSession from '../actions/get-session.js';
import listOrganizationDomains from '../actions/list-organization-domains.js';
import listOrganizationInvitations from '../actions/list-organization-invitations.js';
import listOrganizationMemberships from '../actions/list-organization-memberships.js';
import listOrganizationRoles from '../actions/list-organization-roles.js';
import listSessions from '../actions/list-sessions.js';
import removeOrganizationRolePermission from '../actions/remove-organization-role-permission.js';
import revokeOrganizationInvitation from '../actions/revoke-organization-invitation.js';
import revokeSession from '../actions/revoke-session.js';
import updateEmailAddress from '../actions/update-email-address.js';
import updateOrganizationDomain from '../actions/update-organization-domain.js';
import updateOrganizationMembershipMetadata from '../actions/update-organization-membership-metadata.js';
import updateOrganizationMembership from '../actions/update-organization-membership.js';
import updateOrganizationRole from '../actions/update-organization-role.js';
import updatePhoneNumber from '../actions/update-phone-number.js';
import verifyOrganizationDomain from '../actions/verify-organization-domain.js';

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

const membership = { id: 'orgmem_123', object: 'organization_membership', role: 'org:member' };
const invitation = { id: 'orginv_123', object: 'organization_invitation', email_address: 'ada@example.com', status: 'pending' };
const domain = { id: 'orgdmn_123', object: 'organization_domain', name: 'example.com', verified: false };
const session = { id: 'sess_123', object: 'session', user_id: 'user_123', status: 'active' };
const emailAddress = { id: 'idn_123', object: 'email_address', email_address: 'ada@example.com' };
const phoneNumber = { id: 'idn_456', object: 'phone_number', phone_number: '+15555550100' };
const role = { id: 'role_123', object: 'role', name: 'Editor', key: 'org:editor' };

describe('Clerk priority actions', () => {
    it('manages organization memberships', async () => {
        const listNango = mockNango({ data: [membership], total_count: 2 });
        await expect(listOrganizationMemberships.exec(listNango, { organization_id: 'org/123', cursor: '0', limit: 1 })).resolves.toEqual({
            items: [membership],
            next_cursor: '1',
            total: 2
        });
        expect(listNango.get).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/organizations/org%2F123/memberships', params: expect.objectContaining({ offset: '0', limit: '1' }) })
        );

        const createNango = mockNango(membership);
        await createOrganizationMembership.exec(createNango, { organization_id: 'org_123', user_id: 'user_123', role: 'org:member' });
        expect(createNango.post).toHaveBeenCalledWith(expect.objectContaining({ data: { user_id: 'user_123', role: 'org:member' }, retries: 3 }));

        const updateNango = mockNango(membership);
        await updateOrganizationMembership.exec(updateNango, { organization_id: 'org_123', user_id: 'user_123', role: 'org:admin' });
        await updateOrganizationMembershipMetadata.exec(updateNango, {
            organization_id: 'org_123',
            user_id: 'user_123',
            public_metadata: { team: 'engineering' }
        });
        expect(updateNango.patch).toHaveBeenCalledTimes(2);

        const deleteNango = mockNango();
        await expect(deleteOrganizationMembership.exec(deleteNango, { organization_id: 'org_123', user_id: 'user_123' })).resolves.toEqual({
            id: 'user_123',
            success: true
        });
    });

    it('manages organization invitations', async () => {
        const listNango = mockNango({ data: [invitation], total_count: 1 });
        await expect(listOrganizationInvitations.exec(listNango, { organization_id: 'org_123' })).resolves.toEqual({ items: [invitation], total: 1 });

        const nango = mockNango(invitation);
        await createOrganizationInvitation.exec(nango, { organization_id: 'org_123', email_address: 'ada@example.com', role: 'org:member', notify: true });
        await getOrganizationInvitation.exec(nango, { organization_id: 'org_123', invitation_id: 'orginv_123' });
        await revokeOrganizationInvitation.exec(nango, { organization_id: 'org_123', invitation_id: 'orginv_123' });
        expect(nango.post).toHaveBeenLastCalledWith(
            expect.objectContaining({ endpoint: '/v1/organizations/org_123/invitations/orginv_123/revoke', data: {}, retries: 3 })
        );
    });

    it('manages organization domains', async () => {
        const listNango = mockNango({ data: [domain], total_count: 1 });
        await listOrganizationDomains.exec(listNango, { organization_id: 'org_123', verified: false });
        expect(listNango.get).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ verified: 'false' }) }));

        const nango = mockNango(domain);
        await createOrganizationDomain.exec(nango, { organization_id: 'org_123', name: 'example.com', enrollment_mode: 'automatic_invitation' });
        await updateOrganizationDomain.exec(nango, { organization_id: 'org_123', domain_id: 'orgdmn_123', verified: true });
        await verifyOrganizationDomain.exec(nango, { organization_id: 'org_123', domain_id: 'orgdmn_123' });

        const deleteNango = mockNango();
        await expect(deleteOrganizationDomain.exec(deleteNango, { organization_id: 'org_123', domain_id: 'orgdmn_123' })).resolves.toEqual({
            id: 'orgdmn_123',
            success: true
        });
    });

    it('lists, gets, and revokes sessions', async () => {
        const listNango = mockNango({ data: [session], total_count: 1 });
        await expect(listSessions.exec(listNango, { user_id: 'user_123', status: 'active' })).resolves.toEqual({ items: [session], total: 1 });
        const nango = mockNango(session);
        await getSession.exec(nango, { session_id: 'sess/123' });
        await revokeSession.exec(nango, { session_id: 'sess/123' });
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/sessions/sess%2F123/revoke', data: {} }));
    });

    it('manages email addresses', async () => {
        const nango = mockNango(emailAddress);
        await createEmailAddress.exec(nango, { user_id: 'user_123', email_address: 'ada@example.com', primary: true });
        await getEmailAddress.exec(nango, { email_address_id: 'idn/123' });
        await updateEmailAddress.exec(nango, { email_address_id: 'idn_123', verified: true });
        const deleteNango = mockNango();
        await expect(deleteEmailAddress.exec(deleteNango, { email_address_id: 'idn_123' })).resolves.toEqual({ id: 'idn_123', success: true });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/email_addresses/idn%2F123' }));
    });

    it('manages phone numbers', async () => {
        const nango = mockNango(phoneNumber);
        await createPhoneNumber.exec(nango, { user_id: 'user_123', phone_number: '+15555550100', reserved_for_second_factor: true });
        await getPhoneNumber.exec(nango, { phone_number_id: 'idn/456' });
        await updatePhoneNumber.exec(nango, { phone_number_id: 'idn_456', primary: true });
        const deleteNango = mockNango();
        await expect(deletePhoneNumber.exec(deleteNango, { phone_number_id: 'idn_456' })).resolves.toEqual({ id: 'idn_456', success: true });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/v1/phone_numbers/idn%2F456' }));
    });

    it('manages organization roles and permissions', async () => {
        const listNango = mockNango({ data: [role], total_count: 1 });
        await expect(listOrganizationRoles.exec(listNango, {})).resolves.toEqual({ items: [role], total: 1 });

        const nango = mockNango(role);
        await createOrganizationRole.exec(nango, { name: 'Editor', key: 'org:editor', permissions: ['org:posts:manage'] });
        await getOrganizationRole.exec(nango, { organization_role_id: 'role_123' });
        await updateOrganizationRole.exec(nango, { organization_role_id: 'role_123', name: 'Publisher' });
        await assignOrganizationRolePermission.exec(nango, { organization_role_id: 'role_123', permission_id: 'perm_123' });

        const deleteNango = mockNango();
        await expect(removeOrganizationRolePermission.exec(deleteNango, { organization_role_id: 'role_123', permission_id: 'perm_123' })).resolves.toEqual({
            id: 'perm_123',
            success: true
        });
        await expect(deleteOrganizationRole.exec(deleteNango, { organization_role_id: 'role_123' })).resolves.toEqual({ id: 'role_123', success: true });
    });
});
