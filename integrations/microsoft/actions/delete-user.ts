import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().min(1).describe('The unique identifier of the user to delete. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    userId: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive a user in Microsoft',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/user-delete
        await nango.delete({
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        return {
            success: true,
            userId: input.userId,
            message: 'User deleted successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
