import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fields: z.string().optional().describe('Comma-separated list of fields to retrieve. Example: "id,name,email,picture"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve the authenticated Facebook user profile or another accessible user object.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-user-profile',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_profile'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user
        const response = await nango.get({
            endpoint: '/me',
            params: {
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User profile not found'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.name !== undefined && { name: providerUser.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
