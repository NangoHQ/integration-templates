import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    query: z.string().optional()
        .describe('Text to search for in page/database titles.'),
    filter: z.object({
        property: z.string(),
        value: z.string()
    }).optional()
        .describe('Filter to search only pages or databases. Example: {"property":"object","value":"page"}'),
    sort: z.object({
        direction: z.string(),
        timestamp: z.string()
    }).optional()
        .describe('Sort order. Example: {"direction":"descending","timestamp":"last_edited_time"}'),
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
    description: 'Searches all pages and databases shared with the integration by title.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/search',
        group: 'Search'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/post-search
            endpoint: 'v1/search',
            data: {
                ...(input.query && { query: input.query }),
                ...(input.filter && { filter: input.filter }),
                ...(input.sort && { sort: input.sort }),
                ...(input.page_size && { page_size: input.page_size }),
                ...(input.cursor && { start_cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.post(config);
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
