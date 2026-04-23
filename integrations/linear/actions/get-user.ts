import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique identifier of the Linear user. Example: "user-uuid-123"')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the user'),
    name: z.union([z.string(), z.null()]).describe('The full name of the user'),
    email: z.string().describe('The email address of the user'),
    displayName: z.union([z.string(), z.null()]).describe('The display name of the user'),
    admin: z.boolean().describe('Whether the user is an admin'),
    active: z.boolean().describe('Whether the user is active')
});

const action = createAction({
    description: 'Retrieve a Linear user by user ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        interface UserResponse {
            data?: {
                user?: {
                    id: string;
                    name?: string | null;
                    email: string;
                    displayName?: string | null;
                    admin: boolean;
                    active: boolean;
                } | null;
            };
            errors?: Array<{ message: string }>;
        }

        // https://linear.app/developers
        const response = await nango.post<UserResponse>({
            endpoint: '/graphql',
            data: {
                query: `
                    query GetUser($id: String!) {
                        user(id: $id) {
                            id
                            name
                            email
                            displayName
                            admin
                            active
                        }
                    }
                `,
                variables: {
                    id: input.userId
                }
            },
            retries: 3
        });

        const responseErrors = response.data?.errors;
        if (responseErrors && responseErrors.length > 0) {
            const firstError = responseErrors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message,
                    errors: responseErrors
                });
            }
        }

        const user = response.data?.data?.user;

        if (!user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with ID '${input.userId}' not found`,
                userId: input.userId
            });
        }

        return {
            id: user.id,
            name: user.name ?? null,
            email: user.email,
            displayName: user.displayName ?? null,
            admin: user.admin,
            active: user.active
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
