import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Linear user ID. Example: "usr_123abc"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    displayName: z.string().optional(),
    admin: z.boolean(),
    active: z.boolean()
});

const LinearUserResponseSchema = z.object({
    data: z.object({
        user: ProviderUserSchema
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    displayName: z.string().optional(),
    admin: z.boolean(),
    active: z.boolean()
});

const action = createAction({
    description: 'Retrieve a Linear user by user ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/overview
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query user($id: String!) { user(id: $id) { id name email displayName admin active } }',
                variables: {
                    id: input.userId
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API'
            });
        }

        const parsed = LinearUserResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerUser = parsed.data.data.user;

        return {
            id: providerUser.id,
            name: providerUser.name,
            email: providerUser.email,
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            admin: providerUser.admin,
            active: providerUser.active
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
