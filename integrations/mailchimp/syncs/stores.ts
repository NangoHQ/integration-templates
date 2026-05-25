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

const sync = createSync({
    description: 'Sync stores from Mailchimp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Store: StoreSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/stores'
        }
    ],

    exec: async (nango) => {
        // Blocker: The Mailchimp Marketing API /ecommerce/stores endpoint does not support
        // updated_after, modified_since, since_last_changed, or any changed-since filter.
        // It also does not expose a deleted-record endpoint or cursor for change tracking.
        // Pagination is only via count/offset. Full refresh is required.
        await nango.trackDeletesStart('Store');

        for await (const page of nango.paginate({
            // https://mailchimp.com/developer/marketing/api/ecommerce-stores/list-stores/
            endpoint: '/3.0/ecommerce/stores',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'stores'
            },
            retries: 3
        })) {
            const stores = [];
            for (const raw of page) {
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
        }

        await nango.trackDeletesEnd('Store');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
