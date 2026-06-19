import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    design_ids: z.array(z.string()).min(1)
});

const DimensionsSchema = z.object({
    width: z.number(),
    height: z.number()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const ProviderPageSchema = z.object({
    id: z.string().optional(),
    page_number: z.number().optional(),
    index: z.number().optional(),
    design_type: z.string().optional(),
    dimensions: DimensionsSchema.optional(),
    thumbnail: ThumbnailSchema.optional()
});

const DesignPageSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    page_number: z.number(),
    design_type: z.string().optional(),
    dimensions: DimensionsSchema.optional(),
    thumbnail: ThumbnailSchema.optional()
});

const CheckpointSchema = z.object({
    design_index: z.number().int().nonnegative(),
    offset: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync pages for configured Canva designs.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    // https://www.canva.dev/docs/connect/api-reference/designs/get-design-pages/
    endpoints: [{ method: 'GET', path: '/syncs/design-pages' }],
    scopes: ['design:content:read'],
    models: {
        DesignPage: DesignPageSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        if (metadata.design_ids.length === 0) {
            throw new Error('design_ids is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const designIndex = checkpoint != null && typeof checkpoint['design_index'] === 'number' ? checkpoint['design_index'] : 0;
        const offset = checkpoint != null && typeof checkpoint['offset'] === 'number' ? checkpoint['offset'] : 1;

        if (checkpoint == null) {
            await nango.trackDeletesStart('DesignPage');
        }

        for (let i = designIndex; i < metadata.design_ids.length; i++) {
            const designId = metadata.design_ids[i];
            if (!designId) {
                throw new Error(`design_ids[${i}] is undefined`);
            }

            let nextOffset: number | undefined = i === designIndex ? offset : 1;

            const proxyConfig: ProxyConfiguration = {
                // https://www.canva.dev/docs/connect/api-reference/designs/get-design-pages/
                endpoint: `/rest/v1/designs/${encodeURIComponent(designId)}/pages`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    offset_start_value: nextOffset ?? 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'limit',
                    limit: 50,
                    response_path: 'items',
                    on_page: async ({ nextPageParam }) => {
                        nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const validatedItems = z.array(ProviderPageSchema).safeParse(page);
                if (!validatedItems.success) {
                    throw new Error(`Failed to parse design pages response: ${validatedItems.error.message}`);
                }

                const designPages = validatedItems.data.map((item) => {
                    const pageNumber = item.page_number ?? item.index ?? 0;
                    const pageId = item.id ? `${designId}:${item.id}` : `${designId}:${pageNumber}`;
                    return {
                        id: pageId,
                        design_id: designId,
                        page_number: pageNumber,
                        ...(item.design_type != null && { design_type: item.design_type }),
                        ...(item.dimensions != null && { dimensions: item.dimensions }),
                        ...(item.thumbnail != null && { thumbnail: item.thumbnail })
                    };
                });

                if (designPages.length > 0) {
                    await nango.batchSave(designPages, 'DesignPage');
                }

                if (nextOffset !== undefined) {
                    await nango.saveCheckpoint({
                        design_index: i,
                        offset: nextOffset
                    });
                }
            }

            await nango.saveCheckpoint({
                design_index: i + 1,
                offset: 1
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DesignPage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
