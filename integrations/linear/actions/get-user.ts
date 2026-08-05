import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the Linear user to retrieve. Example: "user-id-123"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    admin: z.boolean().optional(),
    active: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    admin: z.boolean().optional(),
    active: z.boolean().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            user: ProviderUserSchema
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a Linear user by user ID.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'query User($id: String!) { user(id: $id) { id name email displayName admin active } }',
                variables: {
                    id: input.userId
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API.'
            });
        }

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Linear API.'
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL query failed.',
                errors: parsed.data.errors
            });
        }

        const providerUser = parsed.data.data?.user;
        if (!providerUser) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found.'
            });
        }

        return {
            id: providerUser.id,
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.displayName != null && { displayName: providerUser.displayName }),
            ...(providerUser.admin != null && { admin: providerUser.admin }),
            ...(providerUser.active != null && { active: providerUser.active })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
