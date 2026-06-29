import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The ID of the conversation to delete. Example: "abc123"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a Conversational AI conversation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['convai'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://elevenlabs.io/docs/api-reference/conversations/delete
            endpoint: `/v1/convai/conversations/${encodeURIComponent(input.conversation_id)}`,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete conversation. Received status ${response.status}.`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
