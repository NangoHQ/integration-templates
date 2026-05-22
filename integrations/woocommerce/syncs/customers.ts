import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const AddressSchema = z.object({
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    address_1: z.string().nullable().optional(),
    address_2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    country: z.string().nullable().optional()
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional(),
    email: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    billing: AddressSchema.extend({
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional()
    })
        .nullable()
        .optional(),
    shipping: AddressSchema.nullable().optional(),
    is_paying_customer: z.boolean().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    meta_data: z
        .array(
            z.object({
                id: z.number().optional(),
                key: z.string().optional(),
                value: z.unknown().optional()
            })
        )
        .nullable()
        .optional()
});

const CustomerSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.string().optional(),
    username: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    billing: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    shipping: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    is_paying_customer: z.boolean().optional(),
    avatar_url: z.string().optional(),
    meta_data: z
        .array(
            z.object({
                id: z.number().optional(),
                key: z.string().optional(),
                value: z.unknown().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync customers from WooCommerce.',
    version: '2.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/customers' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        // The WooCommerce customers API does not support modified_after filtering,
        // so a full sync with delete tracking is required.
        await nango.trackDeletesStart('Customer');

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers
            endpoint: '/wp-json/wc/v3/customers',
            params: {
                orderby: 'registered_date',
                order: 'asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: LIMIT
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedRecords = page.map((item) => {
                const parsed = ProviderCustomerSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const customers = parsedRecords.map((record) => ({
                id: String(record.id),
                email: record.email,
                ...(record.first_name != null && { first_name: record.first_name }),
                ...(record.last_name != null && { last_name: record.last_name }),
                ...(record.role != null && { role: record.role }),
                ...(record.username != null && { username: record.username }),
                ...(record.date_created != null && { date_created: record.date_created }),
                ...(record.date_created_gmt != null && { date_created_gmt: record.date_created_gmt }),
                ...(record.date_modified != null && { date_modified: record.date_modified }),
                ...(record.date_modified_gmt != null && { date_modified_gmt: record.date_modified_gmt }),
                ...(record.billing != null && {
                    billing: {
                        ...(record.billing.first_name != null && { first_name: record.billing.first_name }),
                        ...(record.billing.last_name != null && { last_name: record.billing.last_name }),
                        ...(record.billing.company != null && { company: record.billing.company }),
                        ...(record.billing.address_1 != null && { address_1: record.billing.address_1 }),
                        ...(record.billing.address_2 != null && { address_2: record.billing.address_2 }),
                        ...(record.billing.city != null && { city: record.billing.city }),
                        ...(record.billing.state != null && { state: record.billing.state }),
                        ...(record.billing.postcode != null && { postcode: record.billing.postcode }),
                        ...(record.billing.country != null && { country: record.billing.country }),
                        ...(record.billing.email != null && { email: record.billing.email }),
                        ...(record.billing.phone != null && { phone: record.billing.phone })
                    }
                }),
                ...(record.shipping != null && {
                    shipping: {
                        ...(record.shipping.first_name != null && { first_name: record.shipping.first_name }),
                        ...(record.shipping.last_name != null && { last_name: record.shipping.last_name }),
                        ...(record.shipping.company != null && { company: record.shipping.company }),
                        ...(record.shipping.address_1 != null && { address_1: record.shipping.address_1 }),
                        ...(record.shipping.address_2 != null && { address_2: record.shipping.address_2 }),
                        ...(record.shipping.city != null && { city: record.shipping.city }),
                        ...(record.shipping.state != null && { state: record.shipping.state }),
                        ...(record.shipping.postcode != null && { postcode: record.shipping.postcode }),
                        ...(record.shipping.country != null && { country: record.shipping.country })
                    }
                }),
                ...(record.is_paying_customer != null && { is_paying_customer: record.is_paying_customer }),
                ...(record.avatar_url != null && { avatar_url: record.avatar_url }),
                ...(record.meta_data != null && { meta_data: record.meta_data })
            }));

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }
        }

        await nango.trackDeletesEnd('Customer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
