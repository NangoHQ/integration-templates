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

const CheckpointSchema = z.object({
    cursor: z.string()
});

const ListBrandTemplatesResponseSchema = z.object({
    continuation: z.string().optional(),
    items: z.array(BrandTemplateSchema)
});

const sync = createSync({
    description: 'Sync brand template metadata',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BrandTemplate: BrandTemplateSchema
    },
    exec: async (nango) => {
        // Blocker: Canva /v1/brand-templates does not support updated_after or modified_since
        // filters. We still save the continuation cursor so interrupted full crawls can resume.
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint != null && typeof checkpoint['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        if (checkpoint == null) {
            await nango.trackDeletesStart('BrandTemplate');
        }

        let hasMore = true;
        while (hasMore) {
            // https://www.canva.dev/docs/connect/api-reference/brand-templates/
            const response = await nango.get({
                endpoint: '/rest/v1/brand-templates',
                params: {
                    limit: 100,
                    ...(cursor !== undefined && { continuation: cursor })
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
                cursor = continuation;
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BrandTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
