import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sendAsEmail: z.string().describe('The email address of the send-as alias to delete. Example: "alias@example.com"')
});

const action = createAction({
    description: 'Delete a custom send-as alias from the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'DELETE',
        path: '/actions/delete-send-as-alias',
        group: 'SendAs'
    },
    input: InputSchema,
    output: z.void(),
    scopes: ['https://www.googleapis.com/auth/gmail.settings.sharing'],

    exec: async (nango, input): Promise<void> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/delete
        await nango.delete({
            endpoint: `/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(input.sendAsEmail)}`,
            retries: 3
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
