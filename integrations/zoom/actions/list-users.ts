import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (next_page_token) from the previous response. Omit for the first page.'),
    status: z.enum(['active', 'inactive', 'pending']).optional().describe('User status filter.'),
    page_size: z.number().int().min(30).max(300).optional().describe('Number of records per page. Default: 30, max: 300.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string(),
    type: z.number().int(),
    pmi: z.union([z.string(), z.number().int()]).optional(),
    timezone: z.string().optional(),
    dept: z.string().optional(),
    created_at: z.string().optional(),
    last_login_time: z.string().optional(),
    last_client_version: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    im_group_ids: z.array(z.string()).optional(),
    status: z.string().optional(),
    verified: z.number().int().optional(),
    pic_url: z.string().optional(),
    host_key: z.string().optional(),
    role_id: z.string().optional(),
    plan_united_type: z.string().optional(),
    custom_attributes: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    users: z.array(ProviderUserSchema),
    next_page_token: z.string().optional(),
    total_records: z.number().int().optional(),
    page_number: z.number().int().optional(),
    page_count: z.number().int().optional(),
    page_size: z.number().int().optional()
});

const action = createAction({
    description: 'List users from Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:read:admin'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/users
            endpoint: '/users',
            params: {
                ...(input.cursor !== undefined && input.cursor.length > 0 && { next_page_token: input.cursor }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                users: z.array(z.unknown()),
                next_page_token: z.string().optional(),
                total_records: z.number().int().optional(),
                page_number: z.number().int().optional(),
                page_count: z.number().int().optional(),
                page_size: z.number().int().optional()
            })
            .parse(response.data);

        const users = providerResponse.users.map((user) => ProviderUserSchema.parse(user));

        return {
            users,
            ...(providerResponse.next_page_token !== undefined &&
                providerResponse.next_page_token.length > 0 && {
                    next_page_token: providerResponse.next_page_token
                }),
            ...(providerResponse.total_records !== undefined && { total_records: providerResponse.total_records }),
            ...(providerResponse.page_number !== undefined && { page_number: providerResponse.page_number }),
            ...(providerResponse.page_count !== undefined && { page_count: providerResponse.page_count }),
            ...(providerResponse.page_size !== undefined && { page_size: providerResponse.page_size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
