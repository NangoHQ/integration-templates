import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    indexName: z.string().optional().describe('Index name to filter logs. Example: "algolia_movie_sample_dataset"'),
    type: z.enum(['all', 'query', 'build', 'error']).optional().describe('Log type filter. Example: "all"'),
    offset: z.number().int().min(0).optional().describe('Offset for pagination. Example: 0'),
    length: z.number().int().min(1).max(1000).optional().describe('Number of logs to retrieve (max 1000). Example: 10')
});

const LogEntrySchema = z
    .object({
        timestamp: z.string().optional(),
        method: z.string().optional(),
        answer_code: z.string().optional(),
        query_body: z.string().optional(),
        answer: z.string().optional(),
        url: z.string().optional(),
        ip: z.string().optional(),
        query_headers: z.string().optional(),
        sha1: z.string().optional(),
        nb_api_calls: z.union([z.string(), z.number()]).optional(),
        processing_time_ms: z.union([z.string(), z.number()]).optional(),
        index: z.string().optional(),
        query_params: z.string().optional(),
        query_nb_hits: z.union([z.string(), z.number()]).optional(),
        inner_queries: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    logs: z.array(LogEntrySchema)
});

const action = createAction({
    description: 'Retrieve recent API operation logs from Algolia.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-logs',
        group: 'Logs'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.algolia.com/doc/rest-api/search/#tag/Logs
            endpoint: '/1/logs',
            params: {
                ...(input.indexName !== undefined && { indexName: input.indexName }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.length !== undefined && { length: String(input.length) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                logs: z.array(z.unknown())
            })
            .parse(response.data);

        const logs = providerResponse.logs.map((entry) => LogEntrySchema.parse(entry));

        return {
            logs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
