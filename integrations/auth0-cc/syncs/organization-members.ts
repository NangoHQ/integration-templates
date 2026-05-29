import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OrganizationMemberSchema = z.object({
    user_id: z.string(),
    picture: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    roles: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const OrganizationMemberModelSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    user_id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    picture: z.string().optional(),
    roles: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync members across all organizations from Auth0',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        OrganizationMember: OrganizationMemberModelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/organization-members'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('OrganizationMember');

        const orgsProxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/organizations/get-organizations
            endpoint: '/api/v2/organizations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'from',
                cursor_path_in_response: 'next',
                response_path: 'organizations',
                limit_name_in_request: 'take',
                limit: 50
            },
            retries: 3
        };

        for await (const orgs of nango.paginate(orgsProxyConfig)) {
            if (!Array.isArray(orgs)) {
                throw new Error('Unexpected non-array organizations response');
            }

            for (const rawOrg of orgs) {
                const orgParse = OrganizationSchema.safeParse(rawOrg);
                if (!orgParse.success) {
                    throw new Error(`Invalid organization response: ${orgParse.error.message}`);
                }

                const org = orgParse.data;

                const membersProxyConfig: ProxyConfiguration = {
                    // https://auth0.com/docs/api/management/v2/organizations/get-organization-members
                    endpoint: `/api/v2/organizations/${encodeURIComponent(org.id)}/members`,
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'from',
                        cursor_path_in_response: 'next',
                        response_path: 'members',
                        limit_name_in_request: 'take',
                        limit: 50
                    },
                    retries: 3
                };

                for await (const members of nango.paginate(membersProxyConfig)) {
                    if (!Array.isArray(members)) {
                        throw new Error('Unexpected non-array members response');
                    }

                    const records: {
                        id: string;
                        organization_id: string;
                        user_id: string;
                        email?: string;
                        name?: string;
                        picture?: string;
                        roles?: { id: string; name: string }[];
                    }[] = [];

                    for (const rawMember of members) {
                        const memberParse = OrganizationMemberSchema.safeParse(rawMember);
                        if (!memberParse.success) {
                            throw new Error(`Invalid member response: ${memberParse.error.message}`);
                        }

                        const member = memberParse.data;
                        records.push({
                            id: `${org.id}_${member.user_id}`,
                            organization_id: org.id,
                            user_id: member.user_id,
                            ...(member.email !== undefined && { email: member.email }),
                            ...(member.name !== undefined && { name: member.name }),
                            ...(member.picture !== undefined && { picture: member.picture }),
                            ...(member.roles !== undefined && { roles: member.roles })
                        });
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'OrganizationMember');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('OrganizationMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
