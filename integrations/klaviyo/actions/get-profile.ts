import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Profile ID. Example: "01KWFX4MZPQDSD3YG79C83CBDV"')
});

const ProviderProfileAttributesSchema = z
    .object({
        email: z.string().nullable().optional(),
        phone_number: z.string().nullable().optional(),
        external_id: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
        created: z.string().nullable().optional(),
        updated: z.string().nullable().optional(),
        last_event_date: z.string().nullable().optional(),
        location: z.record(z.string(), z.unknown()).nullable().optional(),
        properties: z.record(z.string(), z.unknown()).nullable().optional(),
        subscriptions: z.record(z.string(), z.unknown()).nullable().optional(),
        predictive_analytics: z.record(z.string(), z.unknown()).nullable().optional(),
        anonymous: z.boolean().nullable().optional()
    })
    .passthrough();

const ProviderProfileDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderProfileAttributesSchema,
    relationships: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderProfileDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    image: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    last_event_date: z.string().optional(),
    location: z.record(z.string(), z.unknown()).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    subscriptions: z.record(z.string(), z.unknown()).optional(),
    predictive_analytics: z.record(z.string(), z.unknown()).optional(),
    anonymous: z.boolean().optional()
});

function isErrorWithStatus(error: unknown, status: number): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const response = Reflect.get(error, 'response');
    if (typeof response !== 'object' || response === null) {
        return false;
    }
    return Reflect.get(response, 'status') === status;
}

const action = createAction({
    description: 'Retrieve a profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Catching 404 to return a structured ActionError for missing profiles.
        try {
            // https://developers.klaviyo.com/en/reference/get_profile
            response = await nango.get({
                endpoint: `/api/profiles/${encodeURIComponent(input.id)}`,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            });
        } catch (error) {
            if (isErrorWithStatus(error, 404)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Profile with id ${input.id} does not exist.`
                });
            }
            throw error;
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerProfile = providerResponse.data;
        const attrs = providerProfile.attributes;

        return {
            id: providerProfile.id,
            ...(attrs.email != null && { email: attrs.email }),
            ...(attrs.phone_number != null && { phone_number: attrs.phone_number }),
            ...(attrs.external_id != null && { external_id: attrs.external_id }),
            ...(attrs.first_name != null && { first_name: attrs.first_name }),
            ...(attrs.last_name != null && { last_name: attrs.last_name }),
            ...(attrs.title != null && { title: attrs.title }),
            ...(attrs.organization != null && { organization: attrs.organization }),
            ...(attrs.image != null && { image: attrs.image }),
            ...(attrs.created != null && { created: attrs.created }),
            ...(attrs.updated != null && { updated: attrs.updated }),
            ...(attrs.last_event_date != null && { last_event_date: attrs.last_event_date }),
            ...(attrs.location != null && { location: attrs.location }),
            ...(attrs.properties != null && { properties: attrs.properties }),
            ...(attrs.subscriptions != null && { subscriptions: attrs.subscriptions }),
            ...(attrs.predictive_analytics != null && { predictive_analytics: attrs.predictive_analytics }),
            ...(attrs.anonymous != null && { anonymous: attrs.anonymous })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
