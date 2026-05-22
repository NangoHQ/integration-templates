import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
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

const InputSchema = z.object({
    store_id: z.string().describe('The unique identifier for the store. Example: "example_store"'),
    name: z.string().optional().describe('The name of the store.'),
    platform: z.string().optional().describe('The e-commerce platform of the store.'),
    domain: z.string().optional().describe('The store domain.'),
    is_syncing: z.boolean().optional().describe('Whether to disable automations because the store is currently syncing.'),
    email_address: z.string().optional().describe('The email address for the store.'),
    currency_code: z.string().optional().describe('The three-letter ISO 4217 code for the currency that the store accepts.'),
    money_format: z.string().optional().describe('The currency format for the store.'),
    primary_locale: z.string().optional().describe('The primary locale for the store.'),
    timezone: z.string().optional().describe('The timezone for the store.'),
    phone: z.string().optional().describe('The store phone number.'),
    address: AddressSchema.optional().describe('The store address.')
});

const ConnectedSiteSchema = z.object({
    site_foreign_id: z.string().optional(),
    site_script: z
        .object({
            url: z.string().optional(),
            fragment: z.string().optional()
        })
        .optional()
});

const AutomationSchema = z.object({
    is_supported: z.boolean().optional(),
    id: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    list_id: z.string().optional(),
    name: z.string().optional(),
    platform: z.string().optional(),
    domain: z.string().optional(),
    is_syncing: z.boolean().optional(),
    email_address: z.string().optional(),
    currency_code: z.string().optional(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: AddressSchema.optional(),
    connected_site: ConnectedSiteSchema.optional(),
    automations: z
        .object({
            abandoned_cart: AutomationSchema.optional(),
            abandoned_browse: AutomationSchema.optional()
        })
        .optional(),
    list_is_active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update a store in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-store',
        group: 'E-commerce Stores'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            name?: string;
            platform?: string;
            domain?: string;
            is_syncing?: boolean;
            email_address?: string;
            currency_code?: string;
            money_format?: string;
            primary_locale?: string;
            timezone?: string;
            phone?: string;
            address?: z.infer<typeof AddressSchema>;
        } = {};

        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.platform !== undefined) {
            data.platform = input.platform;
        }
        if (input.domain !== undefined) {
            data.domain = input.domain;
        }
        if (input.is_syncing !== undefined) {
            data.is_syncing = input.is_syncing;
        }
        if (input.email_address !== undefined) {
            data.email_address = input.email_address;
        }
        if (input.currency_code !== undefined) {
            data.currency_code = input.currency_code;
        }
        if (input.money_format !== undefined) {
            data.money_format = input.money_format;
        }
        if (input.primary_locale !== undefined) {
            data.primary_locale = input.primary_locale;
        }
        if (input.timezone !== undefined) {
            data.timezone = input.timezone;
        }
        if (input.phone !== undefined) {
            data.phone = input.phone;
        }
        if (input.address !== undefined) {
            data.address = input.address;
        }

        // https://mailchimp.com/developer/marketing/api/ecommerce-stores/update-store/
        const response = await nango.patch({
            endpoint: `/3.0/ecommerce/stores/${encodeURIComponent(input.store_id)}`,
            data: data,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Store not found or update failed.',
                store_id: input.store_id
            });
        }

        const providerStore = OutputSchema.parse(response.data);

        return providerStore;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
