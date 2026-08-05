import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    email: z.string().optional().describe('Filter by email address. Example: "user@example.com"'),
    admin: z.boolean().optional().describe('Filter by admin status.'),
    including_inactive: z.boolean().optional().describe('Include inactive users in results.'),
    user_level: z.number().optional().describe('Filter by user level. Example: 1, 2, or 3.')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    admin: z.boolean().optional(),
    user_level: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(ProviderUserSchema),
    pagination: ProviderPaginationSchema
});

const OutputSchema = z.object({
    users: z.array(ProviderUserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List users (team members) in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const params: Record<string, string | number> = {
            page: page.toString()
        };
        if (input.email !== undefined) {
            params['conditions[email]'] = input.email;
        }
        if (input.admin !== undefined) {
            params['conditions[admin]'] = String(input.admin);
        }
        if (input.including_inactive !== undefined) {
            params['conditions[including_inactive]'] = String(input.including_inactive);
        }
        if (input.user_level !== undefined) {
            params['conditions[user_level]'] = input.user_level;
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/users',
            params,
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const hasMore = listResponse.pagination.page < listResponse.pagination.pages;

        return {
            users: listResponse.entries,
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
