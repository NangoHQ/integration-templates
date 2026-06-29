import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('User ID. Example: "user_abc123"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    organizations: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    image: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    organizations: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a single user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/api/resources/users/get
            endpoint: `/v1/user/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                id: input.id
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.first_name != null && { first_name: providerUser.first_name }),
            ...(providerUser.last_name != null && { last_name: providerUser.last_name }),
            ...(providerUser.image != null && { image: providerUser.image }),
            ...(providerUser.date_created != null && { date_created: providerUser.date_created }),
            ...(providerUser.date_updated != null && { date_updated: providerUser.date_updated }),
            ...(providerUser.organizations != null && { organizations: providerUser.organizations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
