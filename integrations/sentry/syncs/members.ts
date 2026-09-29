import { createSync } from 'nango';
import { z } from 'zod';

const MemberUserSchema = z
    .object({
        id: z.string().describe('Unique ID of the linked Sentry user account, e.g. 5026258.'),
        name: z.string().describe('Display name of the user. Defaults to the email address.'),
        username: z.string().describe('Username of the user. Defaults to the email address.'),
        email: z.string().describe('Email address of the user, e.g. api@nango.dev.'),
        avatarUrl: z.string().describe('URL of the user avatar image.'),
        isActive: z.boolean().describe('Whether the user account is active.'),
        has2fa: z.boolean().describe('Whether the user has two-factor authentication enabled.'),
        isManaged: z.boolean().describe('Whether the user account is managed by an external identity provider.'),
        isStaff: z.boolean().describe('Whether the user is a Sentry staff account.'),
        isSuperuser: z.boolean().describe('Whether the user is a Sentry superuser.'),
        isSuspended: z.boolean().describe('Whether the user account is suspended.'),
        hasPasswordAuth: z.boolean().describe('Whether the user can authenticate with a password.'),
        dateJoined: z.string().describe('ISO 8601 timestamp of when the user account was created, e.g. 2026-09-29T14:09:00.725342Z.'),
        lastLogin: z.string().nullable().describe('ISO 8601 timestamp of the last login, or null if the user has never logged in.'),
        lastActive: z.string().nullable().describe('ISO 8601 timestamp of the last user activity, or null if the user has never been active.')
    })
    .describe('Sentry user account linked to the membership.');

const MemberSchema = z
    .object({
        id: z.string().describe('Unique ID of the organization membership, e.g. 15174593.'),
        email: z.string().describe('Email address the membership is bound to, e.g. api@nango.dev.'),
        name: z.string().describe('Display name of the member. Defaults to the email address.'),
        orgRole: z.string().describe('Organization-level role of the member, e.g. owner, manager, member or billing.'),
        pending: z.boolean().describe('Whether the membership invite is still pending acceptance.'),
        expired: z.boolean().describe('Whether the membership invite has expired.'),
        inviteStatus: z.string().describe('Invite approval status, e.g. approved, requested_to_be_invited or requested_to_join.'),
        inviterName: z.string().nullable().describe('Name of the member who sent the invite, or null when the member was not invited by anyone.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the membership was created, e.g. 2026-09-29T14:09:02.084485Z.'),
        user: MemberUserSchema.nullable().describe(
            'Sentry user account linked to the membership, or null while the invite is pending and no user account is linked yet.'
        )
    })
    .describe('A Sentry organization member with its organization role and, once the invite is accepted, the linked user account.');

const OrganizationResponseSchema = z.object({
    id: z.string(),
    slug: z.string()
});

/**
 * Sentry paginates through a Link response header that always contains a rel="next"
 * link, even on the last page; the results="false" attribute on that link marks the
 * end of the result set. Follow the next cursor only while results="true".
 */
function nextCursorFromLinkHeader(linkHeader: string): string | undefined {
    for (const link of linkHeader.split(',')) {
        if (!link.includes('rel="next"')) {
            continue;
        }
        if (!link.includes('results="true"')) {
            return undefined;
        }
        const match = /cursor="([^"]+)"/.exec(link);
        return match ? match[1] : undefined;
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync organization members.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['member:read'],
    models: {
        Member: MemberSchema
    },

    exec: async (nango) => {
        // A Sentry API token is scoped to a single organization; resolve its slug once per run.
        // https://docs.sentry.io/api/organizations/ (OpenAPI operation listOrganizations: GET /api/0/organizations/)
        const orgsResponse = await nango.get<unknown>({
            endpoint: '/0/organizations/',
            retries: 3
        });
        const orgs = z.array(OrganizationResponseSchema).parse(orgsResponse.data);
        const organization = orgs[0];
        if (!organization) {
            throw new Error('No Sentry organization is accessible for this connection.');
        }

        // Full refresh: the members endpoint has no modified-since filter, so every run
        // crawls all members. Delete tracking must span the complete crawl, so the crawl
        // always starts from page 1 and no cursor checkpoint is restored or persisted.
        await nango.trackDeletesStart('Member');

        let totalSaved = 0;
        let cursor: string | undefined;
        do {
            // https://docs.sentry.io/api/organizations/list-an-organizations-members/
            const response = await nango.get<unknown>({
                endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/members/`,
                params: {
                    per_page: 100,
                    ...(cursor ? { cursor } : {})
                },
                retries: 3
            });
            // A delete-tracked crawl must fail loudly on an unexpected payload: skipping a
            // malformed record here would mark it as deleted at trackDeletesEnd.
            const members = z.array(MemberSchema).parse(response.data);
            if (members.length > 0) {
                await nango.batchSave(members, 'Member');
                totalSaved += members.length;
            }
            const linkHeader: unknown = response.headers['link'];
            cursor = typeof linkHeader === 'string' ? nextCursorFromLinkHeader(linkHeader) : undefined;
        } while (cursor !== undefined);

        await nango.trackDeletesEnd('Member');
        await nango.log(`Synced ${totalSaved} organization members.`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
