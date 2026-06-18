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
    id: z.string().describe('The unique identifier for the store. Example: "my_store_001"'),
    list_id: z.string().describe('The Mailchimp list ID to associate with the store. Example: "a1b2c3d4e5"'),
    name: z.string().describe('The name of the store. Example: "My Online Store"'),
    currency_code: z.string().describe('The three-letter ISO 4217 currency code. Example: "USD"'),
    platform: z.string().optional().describe('The e-commerce platform of the store.'),
    domain: z.string().optional().describe('The store domain.'),
    is_syncing: z.boolean().optional().describe('Whether the store is currently syncing.'),
    email_address: z.string().optional().describe('The email address for the store.'),
    money_format: z.string().optional().describe('The currency format for the store.'),
    primary_locale: z.string().optional().describe('The primary locale for the store. Example: "en"'),
    timezone: z.string().optional().describe('The timezone for the store.'),
    phone: z.string().optional().describe('The store phone number.'),
    address: AddressSchema.optional().describe('The store address.')
});

const ProviderAddressSchema = z.object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    province_code: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    longitude: z.number().nullable().optional(),
    latitude: z.number().nullable().optional()
});

const ProviderStoreSchema = z.object({
    id: z.string(),
    list_id: z.string(),
    name: z.string(),
    platform: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    is_syncing: z.boolean().nullable().optional(),
    email_address: z.string().nullable().optional(),
    currency_code: z.string(),
    money_format: z.string().nullable().optional(),
    primary_locale: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: ProviderAddressSchema.nullable().optional(),
    list_is_active: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    list_id: z.string(),
    name: z.string(),
    platform: z.string().optional(),
    domain: z.string().optional(),
    is_syncing: z.boolean().optional(),
    email_address: z.string().optional(),
    currency_code: z.string(),
    money_format: z.string().optional(),
    primary_locale: z.string().optional(),
    timezone: z.string().optional(),
    phone: z.string().optional(),
    address: AddressSchema.optional(),
    list_is_active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

function normalizeAddress(address: z.infer<typeof ProviderAddressSchema> | null | undefined): z.infer<typeof AddressSchema> | undefined {
    if (!address) {
        return undefined;
    }
    return {
        ...(address.address1 != null && { address1: address.address1 }),
        ...(address.address2 != null && { address2: address.address2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.province != null && { province: address.province }),
        ...(address.province_code != null && { province_code: address.province_code }),
        ...(address.postal_code != null && { postal_code: address.postal_code }),
        ...(address.country != null && { country: address.country }),
        ...(address.country_code != null && { country_code: address.country_code }),
        ...(address.longitude != null && { longitude: address.longitude }),
        ...(address.latitude != null && { latitude: address.latitude })
    };
}

function normalizeStore(store: z.infer<typeof ProviderStoreSchema>): z.infer<typeof OutputSchema> {
    return {
        id: store.id,
        list_id: store.list_id,
        name: store.name,
        currency_code: store.currency_code,
        ...(store.platform != null && { platform: store.platform }),
        ...(store.domain != null && { domain: store.domain }),
        ...(store.is_syncing != null && { is_syncing: store.is_syncing }),
        ...(store.email_address != null && { email_address: store.email_address }),
        ...(store.money_format != null && { money_format: store.money_format }),
        ...(store.primary_locale != null && { primary_locale: store.primary_locale }),
        ...(store.timezone != null && { timezone: store.timezone }),
        ...(store.phone != null && { phone: store.phone }),
        ...(store.address != null && { address: normalizeAddress(store.address) }),
        ...(store.list_is_active != null && { list_is_active: store.list_is_active }),
        ...(store.created_at != null && { created_at: store.created_at }),
        ...(store.updated_at != null && { updated_at: store.updated_at })
    };
}

const action = createAction({
    description: 'Create a store in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ecommerce_stores_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            id: input.id,
            list_id: input.list_id,
            name: input.name,
            currency_code: input.currency_code,
            ...(input.platform !== undefined && { platform: input.platform }),
            ...(input.domain !== undefined && { domain: input.domain }),
            ...(input.is_syncing !== undefined && { is_syncing: input.is_syncing }),
            ...(input.email_address !== undefined && { email_address: input.email_address }),
            ...(input.money_format !== undefined && { money_format: input.money_format }),
            ...(input.primary_locale !== undefined && { primary_locale: input.primary_locale }),
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.address !== undefined && { address: input.address })
        };

        // https://mailchimp.com/developer/marketing/api/ecommerce-stores/add-store/
        const response = await nango.post({
            endpoint: '/3.0/ecommerce/stores',
            data: requestBody,
            retries: 10
        });

        const providerStore = ProviderStoreSchema.parse(response.data);
        return normalizeStore(providerStore);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
