import { createAction } from 'nango';
import * as z from 'zod';

const NO_WRITE_RETRIES = 0;

const InputSchema = z.object({
    sharedMailbox: z
        .string()
        .min(1)
        .optional()
        .describe('Shared mailbox UPN or Microsoft Graph user ID, not an SMTP alias. Requires delegated shared mailbox access.'),
    messageId: z.string().describe('The ID of the message to reply to'),
    comment: z.string().optional().describe('A comment to include in the reply. Required when not creating a draft.'),
    createDraft: z.boolean().optional().describe('If true, creates a draft reply instead of sending immediately'),
    body: z
        .object({
            contentType: z.enum(['text', 'html']),
            content: z.string()
        })
        .optional()
        .describe('The body of the reply message. Use instead of comment for more control.')
});

type InputType = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
    success: z.boolean(),
    draftId: z.string().optional().describe('The ID of the created draft (only when createDraft is true)')
});

type OutputType = z.infer<typeof OutputSchema>;

// Provider response schema for createReplyAll
const DraftMessageResponseSchema = z.object({
    id: z.string()
});

export default createAction({
    description: 'Reply to all recipients on a message',
    version: '1.0.3',
    scopes: ['Mail.ReadWrite', 'Mail.Send', 'Mail.ReadWrite.Shared', 'Mail.Send.Shared'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input: InputType): Promise<OutputType> => {
        const { messageId, comment, createDraft, body } = input;

        if (!messageId) {
            throw new nango.ActionError({
                message: 'messageId is required'
            });
        }

        const encodedMessageId = encodeURIComponent(messageId);
        const mailboxPath = input.sharedMailbox ? `users/${encodeURIComponent(input.sharedMailbox)}` : 'me';

        if (createDraft) {
            // https://learn.microsoft.com/graph/api/message-createreplyall
            const createResponse = await nango.post({
                endpoint: `/v1.0/${mailboxPath}/messages/${encodedMessageId}/createReplyAll`,
                retries: NO_WRITE_RETRIES
            });

            const parsedDraft = DraftMessageResponseSchema.safeParse(createResponse.data);
            if (!parsedDraft.success) {
                throw new nango.ActionError({
                    message: 'Failed to create reply draft: invalid response from provider',
                    details: parsedDraft.error.issues
                });
            }

            const draftId = parsedDraft.data.id;

            // If comment or body is provided, update the draft body
            if (comment || body) {
                const updatePayload: { body?: { contentType: string; content: string } } = {};
                if (body) {
                    updatePayload.body = body;
                } else if (comment) {
                    updatePayload.body = {
                        contentType: 'text',
                        content: comment
                    };
                }

                // https://learn.microsoft.com/graph/api/message-update
                await nango.patch({
                    endpoint: `/v1.0/${mailboxPath}/messages/${encodeURIComponent(draftId)}`,
                    data: updatePayload,
                    retries: NO_WRITE_RETRIES
                });
            }

            return {
                success: true,
                draftId: draftId
            };
        }

        // Direct replyAll without creating a draft first
        // https://learn.microsoft.com/graph/api/message-replyall
        const payload: { comment?: string; body?: { contentType: string; content: string } } = {};

        if (body) {
            payload.body = body;
        } else if (comment) {
            payload.comment = comment;
        } else {
            payload.comment = '';
        }

        await nango.post({
            endpoint: `/v1.0/${mailboxPath}/messages/${encodedMessageId}/replyAll`,
            data: payload,
            retries: NO_WRITE_RETRIES
        });

        return {
            success: true
        };
    }
});
