import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        userId: z.string().optional().describe('Auth0 user ID. Example: "auth0|123"'),
        identifier: z.string().optional().describe('User identifier (email, username, or phone number).')
    })
    .refine((data) => data.userId !== undefined || data.identifier !== undefined, {
        message: 'Either userId or identifier must be provided.',
        path: ['userId']
    });

const OutputSchema = z.object({
    success: z.boolean(),
    userId: z.string().optional(),
    identifier: z.string().optional()
});

const action = createAction({
    description: 'Unblock a user that was blocked due to anomaly detection in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.userId !== undefined) {
            // https://auth0.com/docs/api/management/v2/user-blocks/delete-user-blocks-by-id
            await nango.delete({
                endpoint: `/api/v2/user-blocks/${encodeURIComponent(input.userId)}`,
                retries: 3
            });

            return {
                success: true,
                userId: input.userId
            };
        }

        if (input.identifier !== undefined) {
            // https://auth0.com/docs/api/management/v2/user-blocks/delete-user-blocks
            await nango.delete({
                endpoint: '/api/v2/user-blocks',
                params: {
                    identifier: input.identifier
                },
                retries: 3
            });

            return {
                success: true,
                identifier: input.identifier
            };
        }

        throw new nango.ActionError({
            type: 'invalid_input',
            message: 'Either userId or identifier must be provided.'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
