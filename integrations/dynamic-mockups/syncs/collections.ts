import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCollectionSchema = z
    .object({
        uuid: z.string(),
        name: z.string().nullish(),
        mockup_count: z.number().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish(),
        created_at_timestamp: z.number().nullish(),
        updated_at_timestamp: z.number().nullish()
    })
    .passthrough();

const CollectionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mockup_count: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync collections (named groupings of mockups) in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Collection: CollectionSchema
    },

    exec: async (nango) => {
        // https://docs.dynamicmockups.com/
        await nango.trackDeletesStart('Collection');

        const response = await nango.get({
            endpoint: '/v1/collections',
            retries: 3
        });

        const envelope = z
            .object({
                data: z.array(z.unknown()),
                success: z.boolean().optional(),
                message: z.string().optional()
            })
            .safeParse(response.data);

        if (!envelope.success) {
            throw new Error(`Invalid collections envelope: ${envelope.error.message}`);
        }

        const parsed = ProviderCollectionSchema.array().safeParse(envelope.data.data);

        if (!parsed.success) {
            throw new Error(`Invalid collections response: ${parsed.error.message}`);
        }

        const collections = parsed.data.map((collection) => ({
            id: collection.uuid,
            ...(collection.name != null && { name: collection.name }),
            ...(collection.mockup_count != null && { mockup_count: collection.mockup_count }),
            ...(collection.created_at != null && { created_at: collection.created_at }),
            ...(collection.updated_at != null && { updated_at: collection.updated_at })
        }));

        if (collections.length > 0) {
            await nango.batchSave(collections, 'Collection');
        }

        await nango.trackDeletesEnd('Collection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
