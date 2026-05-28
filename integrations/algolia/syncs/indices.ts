import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderIndexSchema = z.object({
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    entries: z.number().optional(),
    dataSize: z.number().optional(),
    fileSize: z.number().optional(),
    lastBuildTimeS: z.number().optional(),
    numberOfPendingTasks: z.number().optional(),
    pendingTask: z.boolean().optional()
});

const IndexSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    entries: z.number().optional(),
    dataSize: z.number().optional(),
    fileSize: z.number().optional(),
    lastBuildTimeS: z.number().optional(),
    numberOfPendingTasks: z.number().optional(),
    pendingTask: z.boolean().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync indices from Algolia.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://www.algolia.com/doc/rest-api/search/#list-indices
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/indices'
        }
    ],
    models: {
        Index: IndexSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const startPage = checkpoint?.page ?? 0;

        // Blocker: Algolia list indices does not expose changed-since or
        // deleted-index endpoints. We still checkpoint the current page so an
        // interrupted full refresh can resume.
        await nango.trackDeletesStart('Index');

        const proxyConfig: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#list-indices
            endpoint: '/1/indexes',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: startPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'hitsPerPage',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        await nango.saveCheckpoint({ page: nextPageParam + 1 });
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            if (page.length === 0) {
                continue;
            }

            const indices = [];
            for (const item of page) {
                const parsed = ProviderIndexSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse index item: ${parsed.error.message}`);
                }

                const record = parsed.data;
                indices.push({
                    id: record.name,
                    name: record.name,
                    ...(record.createdAt !== undefined && { createdAt: record.createdAt }),
                    ...(record.updatedAt !== undefined && { updatedAt: record.updatedAt }),
                    ...(record.entries !== undefined && { entries: record.entries }),
                    ...(record.dataSize !== undefined && { dataSize: record.dataSize }),
                    ...(record.fileSize !== undefined && { fileSize: record.fileSize }),
                    ...(record.lastBuildTimeS !== undefined && { lastBuildTimeS: record.lastBuildTimeS }),
                    ...(record.numberOfPendingTasks !== undefined && { numberOfPendingTasks: record.numberOfPendingTasks }),
                    ...(record.pendingTask !== undefined && { pendingTask: record.pendingTask })
                });
            }

            if (indices.length > 0) {
                await nango.batchSave(indices, 'Index');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Index');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
