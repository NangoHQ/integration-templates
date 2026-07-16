import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogObjectSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        updated_at: z.string(),
        is_deleted: z.boolean().optional()
    })
    .passthrough();

const SearchCatalogObjectsResponseSchema = z.object({
    objects: z.array(CatalogObjectSchema).optional(),
    cursor: z.string().optional(),
    errors: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync catalog objects',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CatalogObject: CatalogObjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || '';
        let cursor = checkpoint?.cursor || '';
        let maxUpdatedAt = '';

        while (true) {
            const config: ProxyConfiguration = {
                // https://developer.squareup.com/reference/square/catalog-api/search-catalog-objects
                endpoint: '/v2/catalog/search',
                method: 'POST',
                data: {
                    object_types: [
                        'ITEM',
                        'CATEGORY',
                        'TAX',
                        'DISCOUNT',
                        'MODIFIER_LIST',
                        'PRICING_RULE',
                        'PRODUCT_SET',
                        'TIME_PERIOD',
                        'MEASUREMENT_UNIT',
                        'SUBSCRIPTION_PLAN',
                        'ITEM_OPTION',
                        'CUSTOM_ATTRIBUTE_DEFINITION',
                        'IMAGE',
                        'ITEM_OPTION_VAL',
                        'ITEM_VARIATION',
                        'MODIFIER'
                    ],
                    include_deleted_objects: true,
                    limit: 100,
                    ...(updatedAfter && { begin_time: updatedAfter }),
                    ...(cursor && { cursor })
                },
                retries: 3
            };

            const response = await nango.post(config);
            const parsed = SearchCatalogObjectsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse catalog search response: ${parsed.error.message}`);
            }

            const objects = parsed.data.objects ?? [];
            const nextCursor = parsed.data.cursor;

            if (objects.length === 0) {
                break;
            }

            const upserts = objects.filter((obj) => !obj.is_deleted);
            const deletions = objects.filter((obj) => obj.is_deleted).map((obj) => ({ id: obj.id }));

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'CatalogObject');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'CatalogObject');
            }

            for (const obj of objects) {
                if (obj.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = obj.updated_at;
                }
            }

            if (nextCursor) {
                cursor = nextCursor;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor: nextCursor
                });
            } else {
                await nango.saveCheckpoint({
                    updated_after: maxUpdatedAt,
                    cursor: ''
                });
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
