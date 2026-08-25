import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCatalogSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    catalog_type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CatalogSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    catalog_type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync product catalogs',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Catalog: CatalogSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/catalogs does not expose an updated-since or modified-since filter,
        // so every run must walk the full dataset. The provider bookmark cursor is used as a
        // checkpoint so that a resumed full refresh continues from the last fetched page.
        // https://developers.pinterest.com/docs/api/v5/#operation/catalogs/list
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { bookmark: '' });
        if (!checkpointResult.success) {
            throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
        }
        let bookmark = checkpointResult.data.bookmark !== '' ? checkpointResult.data.bookmark : undefined;

        await nango.trackDeletesStart('Catalog');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/catalogs/list
            endpoint: '/v5/catalogs',
            params: {
                ...(bookmark && { bookmark })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    bookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const catalogs = [];
            for (const raw of page) {
                const parsed = ProviderCatalogSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse catalog: ${parsed.error.message}`);
                }
                const record = parsed.data;
                catalogs.push({
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.catalog_type != null && { catalog_type: record.catalog_type }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at })
                });
            }

            if (catalogs.length > 0) {
                await nango.batchSave(catalogs, 'Catalog');
            }

            if (bookmark !== undefined) {
                await nango.saveCheckpoint({ bookmark });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Catalog');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
