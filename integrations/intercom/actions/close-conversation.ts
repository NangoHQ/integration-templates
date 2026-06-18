import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The unique identifier for the conversation to close. Example: "123"'),
    admin_id: z.string().describe('The ID of the admin who is closing the conversation. Example: "456"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the conversation was successfully closed'),
    conversation_id: z.string().describe('The ID of the closed conversation')
});

const action = createAction({
    description: 'Close an open conversation',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_conversations', 'write_conversations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/
        await nango.post({
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/parts`,
            data: {
                type: 'admin',
                message_type: 'close',
                admin_id: input.admin_id
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        return {
            success: true,
            conversation_id: input.conversation_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
