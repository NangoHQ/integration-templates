import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the location to retrieve. Example: "7683107397838218873"')
    })
    .describe('Input for retrieving a single location by ID.');

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    is_default: z.boolean().nullable().optional(),
    active: z.boolean().nullable().optional(),
    legacy: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    location: ProviderLocationSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the location.'),
        name: z.string().optional().describe('The display name of the location.'),
        address1: z.string().optional().describe('The first line of the location address.'),
        address2: z.string().optional().describe('The second line of the location address.'),
        city: z.string().optional().describe('The city of the location.'),
        province: z.string().optional().describe('The province or state of the location.'),
        country: z.string().optional().describe('The country of the location.'),
        zip: z.string().optional().describe('The postal code or ZIP of the location.'),
        phone: z.string().optional().describe('The phone number associated with the location.'),
        is_default: z.boolean().optional().describe('Whether this is the default location for the store.'),
        active: z.boolean().optional().describe('Whether the location is active.'),
        legacy: z.boolean().optional().describe('Whether the location is a legacy location.'),
        created_at: z.string().optional().describe('The timestamp when the location was created.'),
        updated_at: z.string().optional().describe('The timestamp when the location was last updated.')
    })
    .describe('A single location retrieved from the SHOPLINE Admin API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single location by ID from the provider.
 * @pitfalls: Locations are read-only in the Admin REST API; no create, update, or delete endpoints exist, so location management must be done through the SHOPLINE admin UI.
 */
const action = createAction({
    description: 'Retrieve a single location by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/location/shopline-admin-rest-api-v20260601-location-based-on-id-query-location
            endpoint: `/admin/openapi/v20260601/locations/${encodeURIComponent(input.id)}.json`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const location = parsed.location;

        return {
            id: location.id,
            ...(location.name != null && { name: location.name }),
            ...(location.address1 != null && { address1: location.address1 }),
            ...(location.address2 != null && { address2: location.address2 }),
            ...(location.city != null && { city: location.city }),
            ...(location.province != null && { province: location.province }),
            ...(location.country != null && { country: location.country }),
            ...(location.zip != null && { zip: location.zip }),
            ...(location.phone != null && { phone: location.phone }),
            ...(location.is_default != null && { is_default: location.is_default }),
            ...(location.active != null && { active: location.active }),
            ...(location.legacy != null && { legacy: location.legacy }),
            ...(location.created_at != null && { created_at: location.created_at }),
            ...(location.updated_at != null && { updated_at: location.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
