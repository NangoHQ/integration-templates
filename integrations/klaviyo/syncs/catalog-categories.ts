import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogCategoryApiSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        external_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        updated: z.string().nullable().optional()
    })
});

const CatalogCategorySchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    name: z.string().optional(),
    updated: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

function extractCursor(nextUrl: string): string | undefined {
    // @allowTryCatch URL parsing may fail on malformed links from the provider
    try {
        const url = new URL(nextUrl, 'https://a.klaviyo.com');
        const cursor = url.searchParams.get('page[cursor]');
        return cursor ?? undefined;
    } catch {
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync catalog categories.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CatalogCategory: CatalogCategorySchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/catalog-categories has no updated_after, modified_since,
        // changed-records endpoint, or resumable cursor. Only ids, item.id, and name
        // filters are available, none of which support incremental sync.
        const checkpoint = await nango.getCheckpoint();
        let cursor: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            cursor = parsedCheckpoint.data.cursor;
        }

        await nango.trackDeletesStart('CatalogCategory');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_catalog_categories
            endpoint: '/api/catalog-categories',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                'page[size]': 100,
                ...(cursor && { 'page[cursor]': cursor })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        const nextCursor = extractCursor(nextPageParam);
                        if (nextCursor) {
                            await nango.saveCheckpoint({ cursor: nextCursor });
                        }
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const categories: Array<z.infer<typeof CatalogCategorySchema>> = [];
            for (const raw of page) {
                const parsed = CatalogCategoryApiSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse catalog category: ${parsed.error.message}`);
                }
                const record = parsed.data;
                const mapped: z.infer<typeof CatalogCategorySchema> = {
                    id: record.id
                };
                if (record.attributes.external_id != null) {
                    mapped.external_id = record.attributes.external_id;
                }
                if (record.attributes.name != null) {
                    mapped.name = record.attributes.name;
                }
                if (record.attributes.updated != null) {
                    mapped.updated = record.attributes.updated;
                }
                categories.push(mapped);
            }

            if (categories.length > 0) {
                await nango.batchSave(categories, 'CatalogCategory');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CatalogCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
