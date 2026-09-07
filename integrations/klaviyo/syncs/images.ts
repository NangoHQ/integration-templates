import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ImageAttributesSchema = z.object({
    name: z.string().optional(),
    image_url: z.string().optional(),
    format: z.string().optional(),
    size: z.number().optional(),
    hidden: z.boolean().optional(),
    updated_at: z.string().optional()
});

const ImageDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ImageAttributesSchema
});

const LinksSchema = z.object({
    self: z.string().nullish(),
    next: z.string().nullish(),
    prev: z.string().nullish()
});

const ImagesResponseSchema = z.object({
    data: z.array(ImageDataSchema),
    links: LinksSchema.optional()
});

const ImageSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    image_url: z.string().optional(),
    format: z.string().optional(),
    size: z.number().optional(),
    hidden: z.boolean().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    next_cursor: z.string()
});

const sync = createSync({
    description: 'Sync images.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Image: ImageSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /api/images with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const checkpoint = await nango.getCheckpoint();
        let cursor: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            cursor = parsedCheckpoint.data.next_cursor || undefined;
        }

        await nango.trackDeletesStart('Image');

        let hasMore = true;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://developers.klaviyo.com/en/reference/get_images
                endpoint: '/api/images',
                params: {
                    ...(cursor && { 'page[cursor]': cursor }),
                    'page[size]': '100'
                },
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);

            const validated = ImagesResponseSchema.parse(response.data);
            const images = validated.data.map((item) => {
                const attr = item.attributes;
                return {
                    id: item.id,
                    ...(attr.name !== undefined && { name: attr.name }),
                    ...(attr.image_url !== undefined && { image_url: attr.image_url }),
                    ...(attr.format !== undefined && { format: attr.format }),
                    ...(attr.size !== undefined && { size: attr.size }),
                    ...(attr.hidden !== undefined && { hidden: attr.hidden }),
                    ...(attr.updated_at !== undefined && { updated_at: attr.updated_at })
                };
            });

            if (images.length > 0) {
                await nango.batchSave(images, 'Image');
            }

            const nextUrl = validated.links?.next;
            if (nextUrl) {
                const url = nextUrl.startsWith('http') ? new URL(nextUrl) : new URL(nextUrl, 'https://a.klaviyo.com');
                const nextCursor = url.searchParams.get('page[cursor]');
                if (nextCursor && nextCursor !== '') {
                    cursor = nextCursor;
                    await nango.saveCheckpoint({ next_cursor: cursor });
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Image');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
