import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The unique identifier of the message to delete. Example: "AAMkAGVmMDEzM..."')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Delete a message from the mailbox',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-delete
        await nango.delete({
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
