import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The ID of the message containing the attachment. Example: "1234567890abcdef"'),
    attachmentId: z.string().describe('The ID of the attachment to retrieve. Example: "attachment_001"'),
    userId: z.string().optional().describe('The user\'s email address or "me". Defaults to "me".')
});

const ProviderAttachmentSchema = z.object({
    size: z.number(),
    data: z.string()
});

const OutputSchema = z.object({
    size: z.number().describe('The size of the attachment in bytes'),
    data: z.string().describe('The attachment data in base64url encoding')
});

const action = createAction({
    description: 'Retrieve a specific message attachment payload by attachment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';
        const { messageId, attachmentId } = input;

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get
        const response = await nango.get({
            endpoint: `gmail/v1/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Attachment not found',
                messageId,
                attachmentId
            });
        }

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            size: providerAttachment.size,
            data: providerAttachment.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
