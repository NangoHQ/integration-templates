import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LocationSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        address: z.record(z.string(), z.unknown()).optional(),
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
        coordinates: z.record(z.string(), z.unknown()).optional(),
        mcc: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    locations: z.array(LocationSchema).optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z.object({
    locations: z.array(z.record(z.string(), z.unknown()))
});

const action = createAction({
    description: 'List locations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['MERCHANT_PROFILE_READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/locations-api/list-locations
            endpoint: '/v2/locations',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (providerData.errors && providerData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors',
                errors: providerData.errors
            });
        }

        return {
            locations: providerData.locations || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
