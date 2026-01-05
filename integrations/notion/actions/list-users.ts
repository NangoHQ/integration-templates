import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page_size: z.number().optional()
        .describe('Number of results to return (max 100).'),
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response.')
});

const OutputSchema = z.object({
    object: z.string(),
    results: z.array(z.any()),
    has_more: z.boolean(),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Gets paginated list of all workspace users excluding guests.',
    version: '1.0.0',

    // https://developers.notion.com/reference/get-users
    endpoint: {
        method: 'GET',
        path: '/users/list',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/get-users
            endpoint: 'v1/users',
            params: {
                ...(input.page_size && { page_size: input.page_size }),
                ...(input.cursor && { start_cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            object: data.object,
            results: data.results,
            has_more: data.has_more,
            next_cursor: data.next_cursor ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
