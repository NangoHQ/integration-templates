import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters required.');

const LocationSchema = z.object({
    id: z.string().describe('The unique identifier for the location.'),
    name: z.string().describe('The name of the location.'),
    address1: z.string().nullable().optional().describe('The first line of the location address.'),
    address2: z.string().nullable().optional().describe('The second line of the location address.'),
    city: z.string().nullable().optional().describe('The city of the location.'),
    province: z.string().nullable().optional().describe('The province or state of the location.'),
    country: z.string().nullable().optional().describe('The country of the location.'),
    zip: z.string().nullable().optional().describe('The ZIP or postal code of the location.'),
    phone: z.string().nullable().optional().describe('The phone number of the location.'),
    is_default: z.boolean().nullable().optional().describe('Whether this is the default location for the store.'),
    active: z.boolean().nullable().optional().describe('Whether the location is active.'),
    created_at: z.string().nullable().optional().describe('The date and time when the location was created.'),
    updated_at: z.string().nullable().optional().describe('The date and time when the location was last updated.')
});

const OutputSchema = z
    .object({
        locations: z.array(LocationSchema).describe('List of store locations.')
    })
    .describe('Output containing all store locations.');

/**
 * @tags: [read]
 * @tagReason: Lists all store locations with no mutations.
 * @pitfalls: Locations are read-only via the API; no provider endpoints exist to create, update, or delete them.
 */
const action = createAction({
    description: 'List all store locations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_location'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/location/list-locations
            endpoint: '/admin/openapi/v20260601/locations/list.json',
            retries: 3
        });

        const parsed = z
            .object({
                locations: z.array(z.unknown())
            })
            .parse(response.data);

        return {
            locations: parsed.locations.map((location: unknown) => {
                const loc = LocationSchema.parse(location);
                return {
                    id: loc.id,
                    name: loc.name,
                    ...(loc.address1 != null && { address1: loc.address1 }),
                    ...(loc.address2 != null && { address2: loc.address2 }),
                    ...(loc.city != null && { city: loc.city }),
                    ...(loc.province != null && { province: loc.province }),
                    ...(loc.country != null && { country: loc.country }),
                    ...(loc.zip != null && { zip: loc.zip }),
                    ...(loc.phone != null && { phone: loc.phone }),
                    ...(loc.is_default != null && { is_default: loc.is_default }),
                    ...(loc.active != null && { active: loc.active }),
                    ...(loc.created_at != null && { created_at: loc.created_at }),
                    ...(loc.updated_at != null && { updated_at: loc.updated_at })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
