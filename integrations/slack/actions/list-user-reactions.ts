import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    user_id: z.string().optional().describe('User ID to show reactions for. Defaults to the authenticated user.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of items to return. Default is 100, max is 1000.')
});

const OutputSchema = z.object({
    items: z.array(z.any()),
    next_cursor: z.any(),
    total: z.number().int().optional(),
    count: z.number().int().optional()
});

const action = createAction({
    description: 'List items the user reacted to with cursor-based pagination',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-user-reactions',
        group: 'Reactions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['reactions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/reactions.list
        const response = await nango.get({
            endpoint: '/reactions.list',
            params: {
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.user_id && { user: input.user_id }),
                ...(input.limit && { limit: input.limit.toString() })
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to fetch user reactions'
            });
        }

        const items = response.data.items || [];
        const nextCursor = response.data.response_metadata?.next_cursor || undefined;
        const paging = response.data.paging || {};

        return {
            items: items,
            next_cursor: nextCursor,
            total: paging.total,
            count: paging.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
