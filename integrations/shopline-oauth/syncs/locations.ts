import { createSync } from 'nango';
import { z } from 'zod';

const LocationSchema = z
    .object({
        id: z.string().describe('The unique identifier for the location.'),
        name: z.string().optional().describe('The name of the location.'),
        active: z.boolean().optional().describe('Whether the location is enabled.'),
        address1: z.string().optional().describe('The first line of the address.'),
        address2: z.string().optional().describe('The second line of the address.'),
        city: z.string().optional().describe('The city in the address.'),
        country: z.string().optional().describe('The country or region in the address.'),
        country_code: z.string().optional().describe('A two-letter country or region code following the ISO 3166-1 standard.'),
        created_at: z.string().optional().describe('The date and time when the location was created. Format: ISO 8601.'),
        is_default: z.boolean().optional().describe('Whether it is the default location.'),
        legacy: z.boolean().optional().describe('Whether it is a fulfillment app location.'),
        phone: z.string().optional().describe('The phone number for the location.'),
        phone_code: z.string().optional().describe('The international dialing code for the phone number.'),
        province: z.string().optional().describe('The province in the address.'),
        province_code: z.string().optional().describe('The code for the province in the address.'),
        updated_at: z.string().optional().describe('The date and time when the location was last updated. Format: ISO 8601.'),
        zip: z.string().optional().describe('The postal code information of the address.')
    })
    .describe('A store location for inventory and fulfillment.');

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    active: z.boolean().optional(),
    address1: z.string().optional(),
    address2: z.string().nullish(),
    city: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    created_at: z.string().optional(),
    is_default: z.boolean().nullish(),
    legacy: z.boolean().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    phone_code: z.string().optional(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    updated_at: z.string().optional(),
    zip: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    locations: z.array(ProviderLocationSchema)
});

const sync = createSync({
    description: 'Sync store locations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        await nango.getCheckpoint();

        // Blocker: provider only exposes a single-page list endpoint with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor or pagination parameters.
        await nango.trackDeletesStart('Location');

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/location/get-locations
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/locations/list.json',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Invalid response: ' + parsed.error.message);
        }

        const locations = parsed.data.locations.map((location) => ({
            id: location.id,
            ...(location.name !== undefined && location.name !== null && { name: location.name }),
            ...(location.active !== undefined && location.active !== null && { active: location.active }),
            ...(location.address1 !== undefined && location.address1 !== null && { address1: location.address1 }),
            ...(location.address2 !== undefined && location.address2 !== null && { address2: location.address2 }),
            ...(location.city !== undefined && location.city !== null && { city: location.city }),
            ...(location.country !== undefined && location.country !== null && { country: location.country }),
            ...(location.country_code !== undefined && location.country_code !== null && { country_code: location.country_code }),
            ...(location.created_at !== undefined && location.created_at !== null && { created_at: location.created_at }),
            ...(location.is_default !== undefined && location.is_default !== null && { is_default: location.is_default }),
            ...(location.legacy !== undefined && location.legacy !== null && { legacy: location.legacy }),
            ...(location.phone !== undefined && location.phone !== null && { phone: location.phone }),
            ...(location.phone_code !== undefined && location.phone_code !== null && { phone_code: location.phone_code }),
            ...(location.province !== undefined && location.province !== null && { province: location.province }),
            ...(location.province_code !== undefined && location.province_code !== null && { province_code: location.province_code }),
            ...(location.updated_at !== undefined && location.updated_at !== null && { updated_at: location.updated_at }),
            ...(location.zip !== undefined && location.zip !== null && { zip: location.zip })
        }));

        if (locations.length > 0) {
            await nango.batchSave(locations, 'Location');
        }

        await nango.saveCheckpoint({ page: 1 });
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
