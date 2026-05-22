import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('The number of users to return. Maximum 1000.'),
    page: z.number().optional().describe('The page number to return. Starts at 1.'),
    ids: z.array(z.string()).optional().describe('The unique identifiers of specific users to return.'),
    emails: z.array(z.string()).optional().describe('The specific user emails to return.'),
    name: z.string().optional().describe('A fuzzy search of users by name.')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    created_at: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    is_admin: z.boolean().nullable().optional(),
    is_guest: z.boolean().nullable().optional(),
    is_view_only: z.boolean().nullable().optional(),
    enabled: z.boolean().nullable().optional(),
    teams: z.array(ProviderTeamSchema).nullable().optional()
});

const UserOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    created_at: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    is_admin: z.boolean().optional(),
    is_guest: z.boolean().optional(),
    is_view_only: z.boolean().optional(),
    enabled: z.boolean().optional(),
    teams: z
        .array(
            z.object({
                id: z.string(),
                name: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    users: z.array(UserOutputSchema),
    next_page: z.number().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            users: z.array(ProviderUserSchema)
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'List users from monday.com',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 50;
        const page = input.page ?? 1;

        const query = `
            query GetUsers($limit: Int, $page: Int, $ids: [ID!], $emails: [String], $name: String) {
                users(limit: $limit, page: $page, ids: $ids, emails: $emails, name: $name) {
                    id
                    name
                    email
                    created_at
                    title
                    url
                    is_admin
                    is_guest
                    is_view_only
                    enabled
                    teams {
                        id
                        name
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            limit,
            page
        };
        if (input.ids !== undefined) {
            variables['ids'] = input.ids;
        }
        if (input.emails !== undefined) {
            variables['emails'] = input.emails;
        }
        if (input.name !== undefined) {
            variables['name'] = input.name;
        }

        const config: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/users
            endpoint: '/v2',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const responseData = GraphQLResponseSchema.safeParse(response.data);
        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response format from monday.com'
            });
        }

        if (responseData.data.errors && responseData.data.errors.length > 0) {
            const firstError = responseData.data.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.message ?? 'GraphQL error from monday.com'
            });
        }

        const usersData = responseData.data.data?.users;
        if (!usersData) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No users data in response from monday.com'
            });
        }

        const users = usersData.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            ...(user.created_at != null && { created_at: user.created_at }),
            ...(user.title != null && { title: user.title }),
            ...(user.url != null && { url: user.url }),
            ...(user.is_admin != null && { is_admin: user.is_admin }),
            ...(user.is_guest != null && { is_guest: user.is_guest }),
            ...(user.is_view_only != null && { is_view_only: user.is_view_only }),
            ...(user.enabled != null && { enabled: user.enabled }),
            ...(user.teams != null && {
                teams: user.teams.map((team) => ({
                    id: team.id,
                    ...(team.name != null && { name: team.name })
                }))
            })
        }));

        return {
            users,
            ...(users.length === limit && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
