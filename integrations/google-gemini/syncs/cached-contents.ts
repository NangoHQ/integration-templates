import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CachedContentSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().optional(),
    model: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    expireTime: z.string().optional(),
    usageMetadata: z
        .object({
            totalTokenCount: z.number().optional(),
            textCount: z.number().optional(),
            imageCount: z.number().optional(),
            videoDurationSeconds: z.number().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const ProviderItemSchema = z.object({
    name: z.string(),
    displayName: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    expireTime: z.string().optional(),
    usageMetadata: z
        .object({
            totalTokenCount: z.number().optional(),
            textCount: z.number().optional(),
            imageCount: z.number().optional(),
            videoDurationSeconds: z.number().optional()
        })
        .nullable()
        .optional()
});

const sync = createSync({
    description: 'Sync cached content entries (context cache)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CachedContent: CachedContentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Blocker: the cached contents endpoint does not expose an updated_at filter
        // or cursor that enables incremental sync; only pageToken pagination is available.
        // We checkpoint the page token so a full refresh can resume if interrupted.
        // Delete tracking only runs on fresh (non-resumed) runs: a resumed run starts
        // mid-enumeration and would false-delete records from skipped earlier pages.
        const startingFresh = !checkpoint?.page_token;
        if (startingFresh) {
            await nango.trackDeletesStart('CachedContent');
        }

        let pageToken: string | undefined = checkpoint?.page_token ?? undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://ai.google.dev/api/caching#v1beta.cachedContents.list
            endpoint: '/v1beta/cachedContents',
            params: {
                ...(pageToken && { pageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'cachedContents',
                limit_name_in_request: 'pageSize',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        pageToken = nextPageParam;
                    } else {
                        pageToken = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;

            const records = items.map((item) => {
                const parsed = ProviderItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse cached content item: ${parsed.error.message}`);
                }

                const data = parsed.data;

                return {
                    id: data.name,
                    name: data.name,
                    ...(data.displayName != null && { displayName: data.displayName }),
                    ...(data.model != null && { model: data.model }),
                    ...(data.createTime && { createTime: data.createTime }),
                    ...(data.updateTime && { updateTime: data.updateTime }),
                    ...(data.expireTime && { expireTime: data.expireTime }),
                    ...(data.usageMetadata && { usageMetadata: data.usageMetadata })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'CachedContent');
            }

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.clearCheckpoint();
        if (startingFresh) {
            await nango.trackDeletesEnd('CachedContent');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
