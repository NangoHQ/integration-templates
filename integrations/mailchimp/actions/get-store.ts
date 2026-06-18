import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    store_id: z.string().describe('The unique identifier for the store. Example: "store123"')
});

const AutomationSchema = z
    .object({
        is_supported: z.boolean().optional(),
        id: z.string().optional(),
        status: z.string().optional()
    })
    .passthrough();

const AutomationsSchema = z
    .object({
        abandoned_cart: AutomationSchema.optional(),
        abandoned_browse: AutomationSchema.optional()
    })
    .passthrough();

const SiteScriptSchema = z.object({
    url: z.string().optional(),
    fragment: z.string().optional()
});

const ConnectedSiteSchema = z
    .object({
        site_foreign_id: z.string().optional(),
        site_script: SiteScriptSchema.optional(),
        domain: z.string().optional(),
        is_verified: z.boolean().optional()
    })
    .passthrough();

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

const StoreSchema = z
    .object({
        id: z.string(),
        list_id: z.string(),
        name: z.string(),
        platform: z.string(),
        domain: z.string(),
        is_syncing: z.boolean(),
        currency_code: z.string(),
        money_format: z.string(),
        primary_locale: z.string(),
        timezone: z.string().optional(),
        phone: z.string().optional(),
        email_address: z.string().optional(),
        address: AddressSchema.optional(),
        created_at: z.string(),
        updated_at: z.string(),
        list_is_active: z.boolean().optional(),
        automations: AutomationsSchema.optional(),
        connected_site: ConnectedSiteSchema.optional(),
        syncing_flags: z.record(z.string(), z.unknown()).optional(),
        _links: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single store from Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: StoreSchema,

    exec: async (nango, input): Promise<z.infer<typeof StoreSchema>> => {
        // https://mailchimp.com/developer/marketing/api/ecommerce-stores/get-store-info/
        const response = await nango.get({
            endpoint: `/3.0/ecommerce/stores/${encodeURIComponent(input.store_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Store not found',
                store_id: input.store_id
            });
        }

        const store = StoreSchema.parse(response.data);
        return store;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
