import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    data_source_id: z.string(),
    filter: z.optional(z.record(z.string(), z.unknown())),
    sorts: z.optional(z.array(z.record(z.string(), z.unknown()))),
    start_cursor: z.optional(z.string()),
    page_size: z.optional(z.number()),
    in_trash: z.optional(z.boolean())
});

const OutputSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())),
    next_cursor: z.optional(z.string()),
    has_more: z.boolean(),
    request_status: z.optional(z.record(z.string(), z.unknown()))
});

const action = createAction({
    description: 'Query entries in a Notion data source using filters and sorts.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/query-data-source',
        group: 'Data Sources'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input['filter'] !== undefined) {
            requestBody['filter'] = input['filter'];
        }
        if (input['sorts'] !== undefined) {
            requestBody['sorts'] = input['sorts'];
        }
        if (input['start_cursor'] !== undefined) {
            requestBody['start_cursor'] = input['start_cursor'];
        }
        if (input['page_size'] !== undefined) {
            requestBody['page_size'] = input['page_size'];
        }
        if (input['in_trash'] !== undefined) {
            requestBody['in_trash'] = input['in_trash'];
        }
        // https://developers.notion.com/reference/query-a-database
        const response = await nango.post({
            endpoint: `/v1/databases/${encodeURIComponent(input.data_source_id)}/query`,
            data: requestBody,
            retries: 3,
            headers: {
                'Notion-Version': '2022-06-28'
            }
        });

        const ResponseSchema = z.object({
            results: z.array(z.record(z.string(), z.unknown())),
            next_cursor: z.union([z.string(), z.null()]),
            has_more: z.boolean(),
            request_status: z.optional(z.record(z.string(), z.unknown()))
        });

        const parsed = ResponseSchema.parse(response.data);

        return {
            results: parsed.results,
            ...(parsed.next_cursor !== null && { next_cursor: parsed.next_cursor }),
            has_more: parsed.has_more,
            ...(parsed.request_status !== undefined && { request_status: parsed.request_status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
