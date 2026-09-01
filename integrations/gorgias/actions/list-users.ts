import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        external_id: z.string().optional().describe('ID of the user in a foreign system to filter by.'),
        email: z.string().optional().describe('Email address of the user to filter by.'),
        limit: z.number().optional().describe('Maximum number of items to return. Default is 30, maximum is 100.'),
        order_by: z
            .enum(['created_datetime:asc', 'created_datetime:desc', 'name:asc', 'name:desc', 'email:asc', 'email:desc', 'role.name:asc', 'role.name:desc'])
            .optional()
            .describe('Attribute and direction used to order users.'),
        roles: z
            .array(z.enum(['admin', 'agent', 'basic-agent', 'bot', 'internal-agent', 'lite-agent', 'observer-agent']))
            .optional()
            .describe('List of roles to filter users by.'),
        search: z.string().optional().describe('Search term to match against user name or email address.'),
        available_first: z.boolean().optional().describe('When true, available users are returned first, followed by non-available users.')
    })
    .describe('Input for listing users with optional filters and pagination.');

const ProviderUserSchema = z.object({
    id: z.number(),
    email: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    firstname: z.string().optional().nullable(),
    lastname: z.string().optional().nullable(),
    role: z
        .object({
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    active: z.boolean().optional().nullable(),
    bio: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    created_datetime: z.string().optional().nullable(),
    deactivated_datetime: z.string().optional().nullable(),
    external_id: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
    meta: z.object({}).passthrough().optional().nullable(),
    timezone: z.string().optional().nullable(),
    updated_datetime: z.string().optional().nullable(),
    client_id: z.string().optional().nullable()
});

const ProviderListResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(ProviderUserSchema).optional(),
    meta: z
        .object({
            prev_cursor: z.string().optional().nullable(),
            next_cursor: z.string().optional().nullable()
        })
        .optional(),
    uri: z.string().optional()
});

const UserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    email: z.string().optional().describe('Email address of the user.'),
    name: z.string().optional().describe('Full name of the user.'),
    firstname: z.string().optional().describe('First name of the user.'),
    lastname: z.string().optional().describe('Last name of the user.'),
    role: z
        .object({
            name: z.string().optional().describe('Name of the role.')
        })
        .optional()
        .describe('The role of the user.'),
    active: z.boolean().optional().describe('Whether the user can log in.'),
    bio: z.string().optional().describe('Short biography of the user.'),
    country: z.string().optional().describe('Country of the user.'),
    created_datetime: z.string().optional().describe('When the user was created.'),
    deactivated_datetime: z.string().optional().describe('When the user was deactivated.'),
    external_id: z.string().optional().describe('ID of the user in a foreign system.'),
    language: z.string().optional().describe('Language of the user.'),
    meta: z.object({}).passthrough().optional().describe('Data associated with the user.'),
    timezone: z.string().optional().describe('Timezone of the user.'),
    updated_datetime: z.string().optional().describe('When the user was last updated.'),
    client_id: z.string().optional().describe('Service account associated application ID.')
});

const OutputSchema = z
    .object({
        items: z.array(UserSchema).describe('List of users matching the filters.'),
        next_cursor: z.string().optional().describe('Cursor to retrieve the next page of results.')
    })
    .describe('Output containing a list of users and an optional next cursor for pagination.');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only query against the Gorgias users endpoint.
 * @pitfalls: Bot users are included in default results; filter by roles to exclude them when only human agents are needed.
 */
const action = createAction({
    description: 'List users (agents/admins/bots), optionally filtered by role, email, or search term.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/list-users
        const response = await nango.get({
            endpoint: '/api/users',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.roles !== undefined && input.roles.length > 0 && { roles: input.roles }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.available_first !== undefined && { available_first: String(input.available_first) })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = (providerResponse.data || []).map((user) => {
            return {
                id: user.id,
                ...(user.email !== undefined && user.email !== null && { email: user.email }),
                ...(user.name !== undefined && user.name !== null && { name: user.name }),
                ...(user.firstname !== undefined && user.firstname !== null && { firstname: user.firstname }),
                ...(user.lastname !== undefined && user.lastname !== null && { lastname: user.lastname }),
                ...(user.role !== undefined && user.role !== null && { role: { name: user.role.name || undefined } }),
                ...(user.active !== undefined && user.active !== null && { active: user.active }),
                ...(user.bio !== undefined && user.bio !== null && { bio: user.bio }),
                ...(user.country !== undefined && user.country !== null && { country: user.country }),
                ...(user.created_datetime !== undefined && user.created_datetime !== null && { created_datetime: user.created_datetime }),
                ...(user.deactivated_datetime !== undefined && user.deactivated_datetime !== null && { deactivated_datetime: user.deactivated_datetime }),
                ...(user.external_id !== undefined && user.external_id !== null && { external_id: user.external_id }),
                ...(user.language !== undefined && user.language !== null && { language: user.language }),
                ...(user.meta !== undefined && user.meta !== null && { meta: user.meta }),
                ...(user.timezone !== undefined && user.timezone !== null && { timezone: user.timezone }),
                ...(user.updated_datetime !== undefined && user.updated_datetime !== null && { updated_datetime: user.updated_datetime }),
                ...(user.client_id !== undefined && user.client_id !== null && { client_id: user.client_id })
            };
        });

        return {
            items,
            ...(providerResponse.meta?.next_cursor !== undefined &&
                providerResponse.meta.next_cursor !== null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
