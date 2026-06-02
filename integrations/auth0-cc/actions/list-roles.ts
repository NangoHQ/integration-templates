import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 50.'),
    name_filter: z.string().optional().describe('Optional filter on name (case-insensitive).')
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional()
});

const ProviderPaginatedRolesSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    roles: z.array(ProviderRoleSchema)
});

const RoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(RoleSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List roles from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-roles',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(page) || page < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer.'
            });
        }

        const perPage = input.per_page ?? 50;

        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/roles/get-roles
            endpoint: '/api/v2/roles',
            params: {
                page: String(page),
                per_page: String(perPage),
                include_totals: 'true',
                ...(input.name_filter !== undefined && { name_filter: input.name_filter })
            },
            retries: 3
        });

        const paginated = ProviderPaginatedRolesSchema.parse(response.data);
        const hasMore = paginated.start + paginated.roles.length < paginated.total;
        const nextCursor = hasMore ? String(page + 1) : undefined;

        return {
            items: paginated.roles.map((role) => ({
                id: role.id,
                name: role.name,
                ...(role.description !== undefined && { description: role.description })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
