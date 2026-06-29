import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().describe('User ID. Example: 1981305')
});

const ProviderResponseSchema = z.object({
    availability: z.string().describe('Availability status. One of: available, unavailable, offline, custom')
});

const OutputSchema = z.object({
    availability: z.string().describe('Availability status. One of: available, unavailable, offline, custom')
});

const action = createAction({
    description: 'Retrieve the availability status of a single Aircall user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-user-availability',
        method: 'GET'
    },
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/#users
            endpoint: `/v1/users/${encodeURIComponent(String(input.userId))}/availability`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            availability: providerResponse.availability
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
