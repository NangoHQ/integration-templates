import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCatalogItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z
        .object({
            external_id: z.string().nullish(),
            title: z.string().nullish(),
            description: z.string().nullish(),
            price: z.number().nullish(),
            url: z.string().nullish(),
            image_full_url: z.string().nullish(),
            image_thumbnail_url: z.string().nullish(),
            published: z.boolean().nullish(),
            created: z.string().nullish(),
            updated: z.string().nullish()
        })
        .passthrough()
        .optional(),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const CatalogItemSchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    url: z.string().optional(),
    image_full_url: z.string().optional(),
    image_thumbnail_url: z.string().optional(),
    published: z.boolean().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync catalog items (products)',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CatalogItem: CatalogItemSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/catalog-items only supports sorting by created and has no
        // updated_after, modified_since, or changed-records filter. Full-refresh delete
        // tracking is required.
        const checkpoint = await nango.getCheckpoint();
        let resumeCursor: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            resumeCursor = parsedCheckpoint.data.cursor;
        }

        await nango.trackDeletesStart('CatalogItem');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_catalog_items
            endpoint: '/api/catalog-items',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                ...(resumeCursor && { 'page[cursor]': resumeCursor })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        const url = new URL(nextPageParam);
                        const nextCursor = url.searchParams.get('page[cursor]');
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
                throw new Error('Expected page to be an array of catalog items');
            }

            const items = [];
            for (const rawItem of page) {
                const parsed = ProviderCatalogItemSchema.safeParse(rawItem);
                if (!parsed.success) {
                    throw new Error(`Invalid catalog item response: ${parsed.error.message}`);
                }

                const item = parsed.data;
                const attrs = item.attributes;
                items.push({
                    id: item.id,
                    ...(attrs?.external_id != null && { external_id: attrs.external_id }),
                    ...(attrs?.title != null && { title: attrs.title }),
                    ...(attrs?.description != null && { description: attrs.description }),
                    ...(attrs?.price != null && { price: attrs.price }),
                    ...(attrs?.url != null && { url: attrs.url }),
                    ...(attrs?.image_full_url != null && { image_full_url: attrs.image_full_url }),
                    ...(attrs?.image_thumbnail_url != null && { image_thumbnail_url: attrs.image_thumbnail_url }),
                    ...(attrs?.published != null && { published: attrs.published }),
                    ...(attrs?.created != null && { created: attrs.created }),
                    ...(attrs?.updated != null && { updated: attrs.updated })
                });
            }

            if (items.length > 0) {
                await nango.batchSave(items, 'CatalogItem');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CatalogItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
