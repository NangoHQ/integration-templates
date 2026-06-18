import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    message_id: z.string().describe('The unique identifier of the draft message to send. Example: "AAMkAGVmMDEz..."')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the draft was sent successfully'),
    message_id: z
        .string()
        .describe('The ID of the draft that was sent. This equals the input draft ID; the send endpoint returns no body to confirm the sent item ID.')
});

const action = createAction({
    description: 'Send an existing draft message.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Send', 'Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-send
        await nango.post({
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.message_id)}/send`,
            retries: 3
        });

        return {
            success: true,
            message_id: input.message_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
