import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Mixpanel project ID. Example: 4040293'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results to return per page.')
});

const WarehouseImportSchema = z.object({
    id: z.number(),
    import_type: z.enum(['event_sync', 'event_stream', 'people', 'groups', 'lookup_table']),
    sync_mode: z.enum(['time_based', 'mirror_mode', 'full_sync', 'one_time']),
    created: z.string().optional(),
    creator_id: z.number().optional(),
    creator_name: z.string().optional(),
    creator_email: z.string().optional(),
    warehouse_source_id: z.number().optional(),
    table_params: z.object({}).passthrough().optional(),
    paused: z.boolean().optional(),
    run_every: z.union([z.literal(0), z.literal(3600000000000), z.literal(86400000000000), z.literal(604800000000000)]).optional(),
    last_dispatch: z.number().nullable().optional(),
    is_deleted: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    results: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(WarehouseImportSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List warehouse imports.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.mixpanel.com/reference/list-warehouse-imports
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.project_id))}/warehouse-sources/imports`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.results.map((item: unknown) => {
            return WarehouseImportSchema.parse(item);
        });

        return {
            items,
            ...(response.data && typeof response.data === 'object' && 'next_cursor' in response.data && typeof response.data.next_cursor === 'string'
                ? { next_cursor: response.data.next_cursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
