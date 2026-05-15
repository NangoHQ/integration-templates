import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user to delete. Example: "12345"'),
    force: z.boolean().optional().describe('Whether to force the deletion even if the user has content. Defaults to false.'),
    notify: z.boolean().optional().describe('Whether to notify the user that they have been removed. Defaults to false.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the user deletion succeeded'),
    user_id: z.string().describe('The ID of the deleted user')
});

const action = createAction({
    description: 'Deletes a user in Box. Requires an enterprise account.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage_managed_users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.force !== undefined) params['force'] = String(input.force);
        if (input.notify !== undefined) params['notify'] = String(input.notify);

        // https://developer.box.com/reference/delete-users-id/
        await nango.delete({
            endpoint: `/2.0/users/${input.user_id}`,
            params,
            retries: 3
        });

        return {
            success: true,
            user_id: input.user_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
