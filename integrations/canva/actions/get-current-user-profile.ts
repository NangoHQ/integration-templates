import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserProfileSchema = z.object({
    profile: z.object({
        display_name: z.string()
    })
});

const OutputSchema = z.object({
    display_name: z.string()
});

const action = createAction({
    description: 'Retrieve current Canva user profile details.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profile:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.canva.dev/docs/connect/api-reference/users/get-user-profile/
        const response = await nango.get({
            endpoint: '/rest/v1/users/me/profile',
            retries: 3
        });

        const providerResponse = ProviderUserProfileSchema.parse(response.data);

        return {
            display_name: providerResponse.profile.display_name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
