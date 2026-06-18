import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    user_id: z.string().describe('ID of the user. Example: "auth0|123456789"')
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional()
});

const PaginatedRolesSchema = z.object({
    start: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
    roles: z.array(ProviderRoleSchema).optional()
});

const OutputSchema = z.object({
    roles: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List the roles assigned to an organization member in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organization_member_roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const roles: Array<{ id: string; name: string; description?: string }> = [];
        let page = 0;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            // https://auth0.com/docs/api/management/v2/organizations/get-organization-member-roles
            const response = await nango.get({
                endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/members/${encodeURIComponent(input.user_id)}/roles`,
                params: {
                    page: String(page),
                    per_page: String(perPage),
                    include_totals: 'true'
                },
                retries: 3
            });

            if (!response.data) {
                hasMore = false;
                break;
            }

            const paginatedResult = PaginatedRolesSchema.safeParse(response.data);
            if (paginatedResult.success && paginatedResult.data.roles) {
                for (const role of paginatedResult.data.roles) {
                    roles.push({
                        id: role.id,
                        name: role.name,
                        ...(role.description !== undefined && { description: role.description })
                    });
                }

                const total = paginatedResult.data.total ?? 0;
                if (roles.length >= total) {
                    hasMore = false;
                    break;
                }

                page = page + 1;
                continue;
            }

            const arrayResult = z.array(ProviderRoleSchema).safeParse(response.data);
            if (arrayResult.success) {
                for (const role of arrayResult.data) {
                    roles.push({
                        id: role.id,
                        name: role.name,
                        ...(role.description !== undefined && { description: role.description })
                    });
                }
                hasMore = false;
                break;
            }

            hasMore = false;
        }

        return {
            roles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
