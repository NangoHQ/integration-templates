import { createSync } from 'nango';
import { z } from 'zod';

const ProviderAddressSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    longitude: z.number().optional(),
    latitude: z.number().optional()
});

const ProviderStoreSchema = z.object({
    id: z.string(),
    list_id: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    email_address: z.string().optional(),
    currency_code: z.string().optional(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: ProviderAddressSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const StoreSchema = z.object({
    id: z.string(),
    list_id: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    email_address: z.string().optional(),
    currency_code: z.string().optional(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: ProviderAddressSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const ProviderStoresResponseSchema = z.object({
    stores: z.array(ProviderStoreSchema).optional(),
    total_items: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync stores from Mailchimp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Store: StoreSchema
    },
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/stores'
        }
    ],

    exec: async (nango) => {
        // The Mailchimp Marketing API /ecommerce/stores endpoint does not support
        // updated_after, modified_since, since_last_changed, or any changed-since filter.
        // It also does not expose a deleted-record endpoint or cursor for change tracking.
        // Pagination is only via count/offset. Full refresh is required.

        const checkpointResult = await nango.getCheckpoint();
        let offset = 0;
        if (checkpointResult) {
            const parsed = CheckpointSchema.safeParse(checkpointResult);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${parsed.error.message}`);
            }
            offset = parsed.data.offset;
        }

        await nango.trackDeletesStart('Store');

        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            // https://mailchimp.com/developer/marketing/api/ecommerce-stores/list-stores/
            const response = await nango.get({
                endpoint: '/3.0/ecommerce/stores',
                params: {
                    count: String(limit),
                    offset: String(offset)
                },
                retries: 3
            });

            const parsedResponse = ProviderStoresResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse stores response: ${parsedResponse.error.message}`);
            }

            const rawStores = parsedResponse.data.stores ?? [];
            const totalItems = parsedResponse.data.total_items ?? 0;

            const stores = [];
            for (const raw of rawStores) {
                const parsed = ProviderStoreSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse store: ${parsed.error.message}`);
                }
                const record = parsed.data;
                stores.push({
                    id: record.id,
                    ...(record.list_id !== undefined && { list_id: record.list_id }),
                    ...(record.name !== undefined && { name: record.name }),
                    ...(record.domain !== undefined && { domain: record.domain }),
                    ...(record.email_address !== undefined && { email_address: record.email_address }),
                    ...(record.currency_code !== undefined && { currency_code: record.currency_code }),
                    ...(record.money_format !== undefined && { money_format: record.money_format }),
                    ...(record.primary_locale !== undefined && { primary_locale: record.primary_locale }),
                    ...(record.timezone !== undefined && { timezone: record.timezone }),
                    ...(record.phone !== undefined && { phone: record.phone }),
                    ...(record.address !== undefined && { address: record.address }),
                    ...(record.created_at !== undefined && { created_at: record.created_at }),
                    ...(record.updated_at !== undefined && { updated_at: record.updated_at })
                });
            }

            if (stores.length > 0) {
                await nango.batchSave(stores, 'Store');
            }

            offset += limit;
            hasMore = offset < totalItems;

            if (hasMore) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Store');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
