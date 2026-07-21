import { createSync } from 'nango';
import { z } from 'zod';

const ProviderImageSchema = z.object({
    id: z.string(),
    file_name: z.string().nullish(),
    src: z.string().nullish(),
    width: z.number().nullish(),
    height: z.number().nullish()
});

const ImageSchema = z.object({
    id: z.string(),
    file_name: z.string().optional(),
    src: z.string().optional(),
    dimensions: z
        .object({
            width: z.number().optional(),
            height: z.number().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync image metadata.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Image: ImageSchema
    },

    exec: async (nango) => {
        // Blocker: GET /images returns a bare array with no updated/modified
        // timestamp filter, no pagination cursor, and no deleted-record endpoint.
        await nango.trackDeletesStart('Image');

        // https://www.typeform.com/developers/create/
        const response = await nango.get({
            endpoint: '/images',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new Error('Expected array from GET /images');
        }

        const images = response.data.map((item: unknown) => {
            const parsed = ProviderImageSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.file_name != null && { file_name: parsed.file_name }),
                ...(parsed.src != null && { src: parsed.src }),
                ...((parsed.width != null || parsed.height != null) && {
                    dimensions: {
                        ...(parsed.width != null && { width: parsed.width }),
                        ...(parsed.height != null && { height: parsed.height })
                    }
                })
            };
        });

        if (images.length > 0) {
            await nango.batchSave(images, 'Image');
        }

        await nango.trackDeletesEnd('Image');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
