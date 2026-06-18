import { createSync } from 'nango';
import { z } from 'zod';

const VariantSchema = z
    .object({
        channel_id: z.number().optional(),
        product_id: z.number().optional(),
        variant_id: z.number().optional(),
        external_id: z.string().optional(),
        state: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional()
    })
    .passthrough();

const ProviderListingSchema = z
    .object({
        channel_id: z.number(),
        listing_id: z.number(),
        external_id: z.string().optional(),
        product_id: z.number(),
        state: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional(),
        variants: z.array(VariantSchema).optional()
    })
    .passthrough();

const ChannelListingSchema = z.object({
    id: z.string(),
    channel_id: z.number(),
    listing_id: z.number(),
    external_id: z.string().optional(),
    product_id: z.number(),
    state: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    variants: z.array(VariantSchema).optional()
});

const MetadataSchema = z.object({
    channel_ids: z.array(z.number().describe('BigCommerce channel IDs to sync listings for')).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    channel_id: z.number().int().nonnegative(),
    after: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync product listings for each channel.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        ChannelListing: ChannelListingSchema
    },
    endpoints: [
        {
            path: '/syncs/channel-listings',
            method: 'POST'
        }
    ],
    scopes: ['store_channel_listings_read_only'],

    exec: async (nango) => {
        let metadata: z.infer<typeof MetadataSchema> | undefined;
        try {
            metadata = await nango.getMetadata();
        } catch {
            metadata = undefined;
        }
        const channelIds = metadata?.channel_ids && metadata.channel_ids.length > 0 ? metadata.channel_ids : [1];

        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', channel_id: 0, after: 0 });
        const updatedAfter = checkpoint.updated_after || undefined;
        let resumeChannelId = checkpoint.channel_id > 0 ? checkpoint.channel_id : undefined;
        let resumeAfter = checkpoint.after > 0 ? checkpoint.after : undefined;
        const syncStartedAt = new Date().toISOString();

        const limit = 50;

        for (const channelId of channelIds) {
            if (resumeChannelId !== undefined && channelId !== resumeChannelId) {
                continue;
            }
            resumeChannelId = undefined;

            let after = resumeAfter;
            resumeAfter = undefined;

            while (true) {
                const params: Record<string, string | number> = {
                    limit: limit
                };
                if (after !== undefined) {
                    params['after'] = after;
                }
                if (updatedAfter !== undefined) {
                    params['date_modified:min'] = updatedAfter;
                }

                // https://developer.bigcommerce.com/docs/rest-management/channels/channel-listings
                const response = await nango.get({
                    endpoint: `/v3/channels/${encodeURIComponent(String(channelId))}/listings`,
                    params: params,
                    retries: 3
                });

                const body = response.data;
                if (!body || typeof body !== 'object' || !('data' in body)) {
                    throw new Error('Unexpected response shape from channel listings endpoint');
                }

                const rawListings = body.data;
                if (!Array.isArray(rawListings)) {
                    throw new Error('Unexpected response shape: data is not an array');
                }

                if (rawListings.length === 0) {
                    break;
                }

                const listings: z.infer<typeof ChannelListingSchema>[] = [];
                for (const raw of rawListings) {
                    const parsed = ProviderListingSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse channel listing: ${parsed.error.message}`);
                    }
                    const record = parsed.data;
                    listings.push({
                        id: String(record.listing_id),
                        channel_id: record.channel_id,
                        listing_id: record.listing_id,
                        ...(record.external_id !== undefined && { external_id: record.external_id }),
                        product_id: record.product_id,
                        ...(record.state !== undefined && { state: record.state }),
                        ...(record.name !== undefined && { name: record.name }),
                        ...(record.description !== undefined && { description: record.description }),
                        ...(record.date_created !== undefined && { date_created: record.date_created }),
                        ...(record.date_modified !== undefined && { date_modified: record.date_modified }),
                        ...(record.variants !== undefined && { variants: record.variants })
                    });
                }

                await nango.batchSave(listings, 'ChannelListing');

                const lastListing = listings[listings.length - 1];
                if (!lastListing) {
                    break;
                }

                after = lastListing.listing_id;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    channel_id: channelId,
                    after: lastListing.listing_id
                });

                if (rawListings.length < limit) {
                    break;
                }
            }
        }

        await nango.saveCheckpoint({
            updated_after: syncStartedAt,
            channel_id: 0,
            after: 0
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
