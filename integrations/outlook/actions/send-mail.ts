import { z } from 'zod';
import { createAction } from 'nango';

const EmailAddressSchema = z.object({
    address: z.string().describe('The email address. Example: "user@example.com"'),
    name: z.string().optional().describe('The display name of the recipient. Example: "John Doe"')
});

const RecipientSchema = z.object({
    emailAddress: EmailAddressSchema
});

const BodySchema = z.object({
    contentType: z.enum(['text', 'html']).describe('The content type of the body. Example: "html"'),
    content: z.string().describe('The content of the body. Example: "Hello world"')
});

const MessageSchema = z.object({
    subject: z.string().describe('The subject of the message. Example: "Hello from Nango"'),
    body: BodySchema,
    toRecipients: z.array(RecipientSchema).describe('The recipients of the message'),
    ccRecipients: z.array(RecipientSchema).optional().describe('The CC recipients of the message'),
    bccRecipients: z.array(RecipientSchema).optional().describe('The BCC recipients of the message'),
    replyTo: z.array(RecipientSchema).optional().describe('The reply-to recipients of the message'),
    importance: z.enum(['low', 'normal', 'high']).optional().describe('The importance of the message. Example: "normal"')
});

const InputSchema = z.object({
    message: MessageSchema,
    saveToSentItems: z.boolean().optional().describe('Whether to save the message in Sent Items. Default: true')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Send a new email message immediately',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/send-mail',
        group: 'Mail'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Send'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/user-sendmail
        await nango.post({
            endpoint: '/v1.0/me/sendMail',
            data: {
                message: input.message,
                saveToSentItems: input.saveToSentItems ?? true
            },
            retries: 1
        });

        return {
            success: true,
            message: 'Email sent successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
