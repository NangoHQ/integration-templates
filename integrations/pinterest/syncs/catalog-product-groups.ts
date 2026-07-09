import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogProductGroupSchema = z.object({
    id: z.string(),
    catalog_id: z.string(),
    catalog_type: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    feed_id: z.string().optional(),
    country: z.string().optional(),
    locale: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    filters: z.unknown().optional()
});

const RawCatalogsProductGroupItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    catalog_id: z.union([z.string(), z.number()]),
    catalog_type: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    feed_id: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    locale: z.string().nullable().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    filters: z.unknown().optional()
});

function getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
        return undefined;
    }
    if (
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'status' in error.response &&
        typeof error.response.status === 'number'
    ) {
        return error.response.status;
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync catalog product groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CatalogProductGroup: CatalogProductGroupSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v5/catalogs/product_groups with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor that can be safely restored across runs
        // with delete tracking.
        let trackDeletesStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/catalogs_product_groups/list
            endpoint: '/v5/catalogs/product_groups',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        // @allowTryCatch: Pinterest returns 409 when the connected account has no catalog set up.
        // This is a normal state, not a failure, so we handle it explicitly and return early.
        try {
            // https://developers.pinterest.com/docs/api/v5/#operation/catalogs_product_groups/list
            for await (const page of nango.paginate(proxyConfig)) {
                if (!trackDeletesStarted) {
                    await nango.trackDeletesStart('CatalogProductGroup');
                    trackDeletesStarted = true;
                }

                const items = z.array(RawCatalogsProductGroupItemSchema).parse(page);

                const groups = items.map((record) => ({
                    id: String(record.id),
                    catalog_id: String(record.catalog_id),
                    catalog_type: record.catalog_type,
                    ...(record.name != null && { name: record.name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at }),
                    ...(record.feed_id != null && { feed_id: record.feed_id }),
                    ...(record.country != null && { country: record.country }),
                    ...(record.locale != null && { locale: record.locale }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.filters != null && { filters: record.filters })
                }));

                if (groups.length > 0) {
                    await nango.batchSave(groups, 'CatalogProductGroup');
                }
            }
        } catch (error) {
            const status = getErrorStatus(error);
            if (status === 409) {
                return;
            }
            throw error;
        }

        if (trackDeletesStarted) {
            await nango.trackDeletesEnd('CatalogProductGroup');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
