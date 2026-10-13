import { z } from 'zod';
import { createAction } from 'nango';

const NO_WRITE_RETRIES = 0;

const InputSchema = z.object({
    sharedMailbox: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
            'Shared mailbox UPN or Microsoft Graph user ID, not an SMTP alias. Requires delegated Mail.Send.Shared and mailbox access for the connected user.'
        ),
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
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Send', 'Mail.Send.Shared'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-send
        await nango.post({
            endpoint: `/v1.0/${input.sharedMailbox ? `users/${encodeURIComponent(input.sharedMailbox)}` : 'me'}/messages/${encodeURIComponent(input.message_id)}/send`,
            retries: NO_WRITE_RETRIES
        });

        return {
            success: true,
            message_id: input.message_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
