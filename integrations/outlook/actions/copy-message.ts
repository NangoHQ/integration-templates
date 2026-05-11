import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The ID of the message to copy. Example: "AQMkADAwATM0MDAAMS1iN..."'),
    destinationId: z
        .string()
        .describe('The ID of the destination mail folder, or a well-known folder name such as "inbox", "drafts", "sentitems", "deleteditems".')
});

const MessageSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    body: z
        .object({
            contentType: z.string().optional(),
            content: z.string().optional()
        })
        .optional(),
    bodyPreview: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    receivedDateTime: z.string().optional(),
    sentDateTime: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    body: z
        .object({
            contentType: z.string().optional(),
            content: z.string().optional()
        })
        .optional(),
    bodyPreview: z.string().optional()
});

const action = createAction({
    description: 'Copy a message to another mail folder.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/copy-message'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/message-copy
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}/copy`,
            data: {
                destinationId: input.destinationId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found or could not be copied',
                messageId: input.messageId
            });
        }

        const message = MessageSchema.parse(response.data);

        return {
            id: message.id,
            ...(message.subject !== undefined && { subject: message.subject }),
            ...(message.receivedDateTime !== undefined && { receivedDateTime: message.receivedDateTime }),
            ...(message.sentDateTime !== undefined && { sentDateTime: message.sentDateTime }),
            ...(message.hasAttachments !== undefined && { hasAttachments: message.hasAttachments }),
            ...(message.body !== undefined && { body: message.body }),
            ...(message.bodyPreview !== undefined && { bodyPreview: message.bodyPreview })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
