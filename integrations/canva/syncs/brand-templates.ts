import { createSync } from 'nango';
import { z } from 'zod';

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const BrandTemplateSchema = z.object({
    id: z.string(),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: ThumbnailSchema.optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const ListBrandTemplatesResponseSchema = z.object({
    continuation: z.string().optional(),
    items: z.array(BrandTemplateSchema)
});

const CheckpointSchema = z.object({
    continuation: z.string()
});

const sync = createSync({
    description: 'Sync brand template metadata',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BrandTemplate: BrandTemplateSchema
    },
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const cursor =
            checkpoint != null && typeof checkpoint['continuation'] === 'string' && checkpoint['continuation'].length > 0
                ? checkpoint['continuation']
                : undefined;

        // Always start deletion tracking before full enumeration — cursor-based
        // partial resumption would leave earlier pages outside the tracking window.
        await nango.trackDeletesStart('BrandTemplate');

        let nextCursor = cursor;
        let hasMore = true;
        while (hasMore) {
            // https://www.canva.dev/docs/connect/api-reference/brand-templates/
            const response = await nango.get({
                endpoint: '/rest/v1/brand-templates',
                params: {
                    limit: 100,
                    ...(nextCursor != null && { continuation: nextCursor })
                },
                retries: 3
            });

            const parsed = ListBrandTemplatesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse brand templates response: ${parsed.error.message}`);
            }

            const { items, continuation } = parsed.data;
            hasMore = continuation !== undefined;

            if (items.length > 0) {
                await nango.batchSave(items, 'BrandTemplate');
            }

            if (continuation !== undefined) {
                await nango.saveCheckpoint({ continuation });
            }

            nextCursor = continuation;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BrandTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
