import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).describe('Array of Gmail message IDs to delete. Example: ["msg123", "msg456"]')
});

const OutputSchema = z.null();

const action = createAction({
    description: 'Permanently delete multiple Gmail messages by ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-delete-messages',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://mail.google.com/'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchDelete
        await nango.post({
            endpoint: '/gmail/v1/users/me/messages/batchDelete',
            data: {
                ids: input.ids
            },
            retries: 2
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
