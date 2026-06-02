import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "org_abc123"'),
    fields: z.string().optional().describe('Comma-separated list of fields to include or exclude.'),
    include_fields: z.boolean().optional().describe('Whether specified fields are included (true) or excluded (false).')
});

const ProviderMemberRoleSchema = z.object({
    id: z.string().nullish(),
    name: z.string().nullish()
});

const ProviderMemberSchema = z.object({
    user_id: z.string().nullish(),
    picture: z.string().nullish(),
    name: z.string().nullish(),
    email: z.string().nullish(),
    roles: z.array(ProviderMemberRoleSchema).nullish()
});

const OrganizationMemberRoleSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const OrganizationMemberSchema = z.object({
    user_id: z.string().optional(),
    picture: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    roles: z.array(OrganizationMemberRoleSchema).optional()
});

const OutputSchema = z.object({
    members: z.array(OrganizationMemberSchema)
});

const action = createAction({
    description: 'List members of an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-organization-members',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organization_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const members: z.infer<typeof OrganizationMemberSchema>[] = [];
        let from: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const config: ProxyConfiguration = {
                // https://auth0.com/docs/api/management/v2/organizations/get-organization-members
                endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/members`,
                params: {
                    take: '50',
                    ...(from !== undefined && { from }),
                    ...(input.fields !== undefined && { fields: input.fields }),
                    ...(input.include_fields !== undefined && { include_fields: String(input.include_fields) })
                },
                retries: 3
            };
            const response = await nango.get(config);

            if (!response.data || typeof response.data !== 'object') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from Auth0 API.'
                });
            }

            const responseData = response.data;
            const responseMembers = 'members' in responseData && Array.isArray(responseData.members) ? responseData.members : [];

            for (const rawMember of responseMembers) {
                const parsed = ProviderMemberSchema.parse(rawMember);
                const mappedRoles: { id: string; name?: string }[] = [];
                if (parsed.roles != null) {
                    for (const r of parsed.roles) {
                        if (r.id != null) {
                            const role: { id: string; name?: string } = { id: r.id };
                            if (r.name != null) {
                                role.name = r.name;
                            }
                            mappedRoles.push(role);
                        }
                    }
                }

                const member: z.infer<typeof OrganizationMemberSchema> = {
                    ...(parsed.user_id != null && { user_id: parsed.user_id }),
                    ...(parsed.picture != null && { picture: parsed.picture }),
                    ...(parsed.name != null && { name: parsed.name }),
                    ...(parsed.email != null && { email: parsed.email }),
                    ...(parsed.roles != null && { roles: mappedRoles })
                };
                members.push(member);
            }

            const next = 'next' in responseData && typeof responseData.next === 'string' ? responseData.next : undefined;
            if (next) {
                from = next;
            } else {
                hasMore = false;
            }
        }

        return { members };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
