import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to delete. Example: "1234567890"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the user was successfully deleted'),
    userId: z.string().describe('The ID of the deleted user')
});

const action = createAction({
    description: 'Delete a Zendesk user',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#delete-user
        const response = await nango.delete({
            endpoint: `/api/v2/users/${encodeURIComponent(input.userId)}.json`,
            retries: 10
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete user',
                status: response.status,
                userId: input.userId
            });
        }

        return {
            success: true,
            userId: input.userId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
