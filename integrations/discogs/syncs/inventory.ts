import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InventoryListingSchema = z.object({
    id: z.string(),
    listing_id: z.number(),
    status: z.string().optional(),
    condition: z.string().optional(),
    sleeve_condition: z.string().optional(),
    price: z.union([z.number(), z.object({ value: z.number(), currency: z.string() })]).optional(),
    comments: z.string().optional(),
    allow_offers: z.boolean().optional(),
    external_id: z.string().optional(),
    location: z.string().optional(),
    posted: z.string().optional(),
    release: z.record(z.string(), z.unknown()).optional()
});

const ProviderListingSchema = z
    .object({
        id: z.number(),
        status: z.string().nullish(),
        condition: z.string().nullish(),
        sleeve_condition: z.string().nullish(),
        price: z.union([z.number(), z.object({ value: z.number(), currency: z.string() })]).nullish(),
        comments: z.string().nullish(),
        allow_offers: z.boolean().nullish(),
        external_id: z.string().nullish(),
        location: z.string().nullish(),
        posted: z.string().nullish(),
        release: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync marketplace inventory listings for the authenticated user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/inventory', group: 'Inventory' }],
    models: { InventoryListing: InventoryListingSchema },

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        await nango.trackDeletesStart('InventoryListing');

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:marketplace,header-marketplace-inventory
            endpoint: `/users/${encodeURIComponent(username)}/inventory`,
            params: { status: 'All' },
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'listings',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const listings = z.array(ProviderListingSchema).parse(page);
            const records = listings.map((listing) => ({
                id: String(listing.id),
                listing_id: listing.id,
                ...(listing.status != null && { status: listing.status }),
                ...(listing.condition != null && { condition: listing.condition }),
                ...(listing.sleeve_condition != null && { sleeve_condition: listing.sleeve_condition }),
                ...(listing.price != null && { price: listing.price }),
                ...(listing.comments != null && { comments: listing.comments }),
                ...(listing.allow_offers != null && { allow_offers: listing.allow_offers }),
                ...(listing.external_id != null && { external_id: listing.external_id }),
                ...(listing.location != null && { location: listing.location }),
                ...(listing.posted != null && { posted: listing.posted }),
                ...(listing.release !== undefined && { release: listing.release })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'InventoryListing');
            }
        }
        await nango.trackDeletesEnd('InventoryListing');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
