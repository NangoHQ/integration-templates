import { z } from 'zod';
import { createAction } from 'nango';

const NO_WRITE_RETRIES = 0;

const InputSchema = z.object({
    sharedMailbox: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Shared mailbox UPN or Microsoft Graph user ID, not an SMTP alias. Requires delegated Mail.ReadWrite.Shared and mailbox access.'),
    messageId: z.string().describe('The unique identifier of the message to delete. Example: "AAMkAGVmMDEzM..."')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Delete a message from the mailbox',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite', 'Mail.ReadWrite.Shared'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-delete
        await nango.delete({
            endpoint: `/v1.0/${input.sharedMailbox ? `users/${encodeURIComponent(input.sharedMailbox)}` : 'me'}/messages/${encodeURIComponent(input.messageId)}`,
            retries: NO_WRITE_RETRIES
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
