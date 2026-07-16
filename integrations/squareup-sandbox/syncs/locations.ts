import { createSync } from 'nango';
import { z } from 'zod';

const LocationAddressSchema = z
    .object({
        address_line_1: z.string().optional(),
        address_line_2: z.string().optional(),
        address_line_3: z.string().optional(),
        locality: z.string().optional(),
        sublocality: z.string().optional(),
        sublocality_2: z.string().optional(),
        sublocality_3: z.string().optional(),
        administrative_district_level_1: z.string().optional(),
        administrative_district_level_2: z.string().optional(),
        administrative_district_level_3: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
    })
    .passthrough();

const LocationCoordinatesSchema = z
    .object({
        latitude: z.number().optional(),
        longitude: z.number().optional()
    })
    .passthrough();

const LocationSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        address: LocationAddressSchema.optional(),
        timezone: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        merchant_id: z.string().optional(),
        country: z.string().optional(),
        language_code: z.string().optional(),
        currency: z.string().optional(),
        phone_number: z.string().optional(),
        business_name: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        coordinates: LocationCoordinatesSchema.optional(),
        mcc: z.string().optional()
    })
    .passthrough();

const ListLocationsResponseSchema = z.object({
    locations: z.array(z.unknown()),
    errors: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync locations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v2/locations does not expose updated_since, cursor, limit,
        // or pagination. It returns all locations in a single non-paginated response.
        await nango.trackDeletesStart('Location');

        // https://developer.squareup.com/reference/square/locations-api/list-locations
        const response = await nango.get({
            endpoint: '/v2/locations',
            retries: 3
        });

        const parsedResponse = ListLocationsResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse locations list response: ${parsedResponse.error.message}`);
        }

        const locations = parsedResponse.data.locations.map((location) => {
            const parsedLocation = LocationSchema.safeParse(location);
            if (!parsedLocation.success) {
                throw new Error(`Failed to parse location: ${parsedLocation.error.message}`);
            }
            return parsedLocation.data;
        });

        if (locations.length > 0) {
            await nango.batchSave(locations, 'Location');
        }

        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
