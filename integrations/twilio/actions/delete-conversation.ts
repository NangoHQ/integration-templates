import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The unique SID of the conversation to delete. Example: CH7455d9a8e3c541da993a275b699d6c83')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a conversation in Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/conversations/api/conversation-resource#delete-a-conversation-resource
        await nango.delete({
            baseUrlOverride: 'https://conversations.twilio.com',
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
