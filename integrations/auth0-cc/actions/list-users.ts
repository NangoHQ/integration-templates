import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page index). Omit for the first page.'),
    per_page: z.number().int().min(0).max(100).optional().describe('Number of results per page. Maximum 100.'),
    q: z.string().optional().describe('Query in Lucene query string syntax.'),
    sort: z.string().optional().describe('Field to sort by. Use field:order where order is 1 for ascending and -1 for descending.'),
    connection: z.string().optional().describe('Connection filter.'),
    fields: z.string().optional().describe('Comma-separated list of fields to include or exclude.'),
    include_fields: z.boolean().optional().describe('Whether specified fields are to be included (true) or excluded (false).'),
    search_engine: z.enum(['v1', 'v2', 'v3']).optional().describe('The version of the search engine.'),
    primary_order: z.boolean().optional().describe('If true (default), results are returned in a deterministic order.')
});

const UserIdentitySchema = z
    .object({
        connection: z.string().optional(),
        user_id: z.string().optional(),
        provider: z.string().optional(),
        isSocial: z.boolean().optional()
    })
    .passthrough();

const UserSchema = z
    .object({
        user_id: z.string(),
        email: z.string().nullable().optional(),
        email_verified: z.boolean().nullable().optional(),
        username: z.string().nullable().optional(),
        phone_number: z.string().nullable().optional(),
        phone_verified: z.boolean().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        identities: z.array(UserIdentitySchema).optional(),
        app_metadata: z.record(z.string(), z.unknown()).optional(),
        user_metadata: z.record(z.string(), z.unknown()).optional(),
        picture: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        nickname: z.string().nullable().optional(),
        multifactor: z.array(z.string()).optional(),
        last_ip: z.string().nullable().optional(),
        last_login: z.string().nullable().optional(),
        last_password_reset: z.string().nullable().optional(),
        logins_count: z.number().nullable().optional(),
        blocked: z.boolean().nullable().optional(),
        given_name: z.string().nullable().optional(),
        family_name: z.string().nullable().optional()
    })
    .passthrough();

const ProviderPaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    length: z.number(),
    total: z.number(),
    users: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(UserSchema),
    next_cursor: z.string().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List users from Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid page number.'
            });
        }

        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/users/get-users
            endpoint: '/api/v2/users',
            params: {
                include_totals: 'true',
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.q !== undefined && { q: input.q }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.connection !== undefined && { connection: input.connection }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.include_fields !== undefined && { include_fields: String(input.include_fields) }),
                ...(input.search_engine !== undefined && { search_engine: input.search_engine }),
                ...(input.primary_order !== undefined && { primary_order: String(input.primary_order) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerData = ProviderPaginatedResponseSchema.parse(response.data);

        const items = providerData.users.map((item) => {
            return UserSchema.parse(item);
        });

        const hasMore = providerData.start + providerData.length < providerData.total;

        return {
            items,
            ...(hasMore && { next_cursor: String(page + 1) }),
            total: providerData.total
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
