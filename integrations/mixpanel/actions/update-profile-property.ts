import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    distinct_id: z.string().check(z.describe('The distinct ID of the user profile to update. Example: "user-123"')),
    properties: z.record(z.string(), z.unknown()).check(z.describe('Properties to set on the user profile. Example: {"Plan": "Premium"}')),
    project_token: z.string().check(z.describe('The Mixpanel project token. Example: "abc123..."'))
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional(),
    errors: z.record(z.string(), z.unknown()).nullable().optional(),
    num_good_events: z.number().optional()
});

const OutputSchema = z.object({
    status: z.number().check(z.describe('1 if the request structure is valid, 0 if invalid')),
    distinct_id: z.string().check(z.describe('The distinct ID of the updated profile')),
    num_good_events: z.number().optional().check(z.describe('Number of valid records when strict mode is enabled')),
    error: z.string().optional().check(z.describe('Error message if validation failed'))
});

const action = createAction({
    description: 'Set or update user profile properties',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.mixpanel.com/reference/profile-set
            endpoint: '/engage',
            baseUrlOverride: 'https://api.mixpanel.com',
            data: [
                {
                    $token: input.project_token,
                    $distinct_id: input.distinct_id,
                    $set: input.properties
                }
            ],
            params: {
                ip: '0',
                strict: '1',
                verbose: '1'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status === 0) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: providerResponse.error || 'No valid records in the request',
                ...(providerResponse.errors && Object.keys(providerResponse.errors).length > 0 && { errors: providerResponse.errors })
            });
        }

        return {
            status: providerResponse.status,
            distinct_id: input.distinct_id,
            ...(providerResponse.num_good_events !== undefined && { num_good_events: providerResponse.num_good_events }),
            ...(providerResponse.error != null && { error: providerResponse.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
