import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The SID of the conversation. Example: "CH7455d9a8e3c541da993a275b699d6c83"'),
    messageSid: z.string().describe('The SID of the message to delete. Example: "IMaa48a9f1fa3e4e5e90e74a390fa0fc8d"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a message from a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.twilio.com/docs/conversations/api/conversation-message-resource#delete-a-conversationmessage-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}/Messages/${encodeURIComponent(input.messageSid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            retries: 1
        });

        if (response.status === 204) {
            return { success: true };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Failed to delete conversation message. Status: ${response.status}`,
            conversationSid: input.conversationSid,
            messageSid: input.messageSid
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
