import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(50).optional().describe('Number of results per page. Maximum is 50.')
});

const UserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string(),
    language: z.string(),
    substatus: z.string(),
    wrap_up_time: z.number(),
    extension: z.string().optional(),
    default_number_id: z.number().nullable().optional()
});

const MetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable(),
    previous_page_link: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    meta: MetaSchema,
    users: z.array(UserSchema)
});

const OutputSchema = z.object({
    items: z.array(UserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List users from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],
    endpoint: {
        path: '/actions/list-users',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const response = await nango.get({
            // https://developer.aircall.io/api-references/#list-all-users-v2
            endpoint: '/v2/users',
            params: {
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const nextCursor = providerResponse.meta.next_page_link != null ? String(providerResponse.meta.current_page + 1) : undefined;

        return {
            items: providerResponse.users,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
