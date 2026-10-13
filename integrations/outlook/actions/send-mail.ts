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
    from: RecipientSchema.optional().describe(
        'Optional mailbox to send as. Requires the delegated Mail.Send.Shared Graph permission and Send As or Send on Behalf mailbox permission.'
    ),
    importance: z.enum(['low', 'normal', 'high']).optional().describe('The importance of the message. Example: "normal"')
});

const InputSchema = z.object({
    sharedMailbox: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
            'Shared mailbox UPN or Microsoft Graph user ID, not an SMTP alias. Requires delegated Mail.Send.Shared and Exchange Send As/Send on Behalf permission.'
        ),
    message: MessageSchema,
    saveToSentItems: z.boolean().optional().describe('Whether to save the message in Sent Items. Default: true')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const NO_WRITE_RETRIES = 0;

const action = createAction({
    description: 'Send a new email immediately, optionally from a mailbox for which the connected user has Send As or Send on Behalf permission.',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Send', 'Mail.Send.Shared'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/user-sendmail
        await nango.post({
            endpoint: `/v1.0/${input.sharedMailbox ? `users/${encodeURIComponent(input.sharedMailbox)}` : 'me'}/sendMail`,
            data: {
                message: input.message,
                saveToSentItems: input.saveToSentItems ?? true
            },
            retries: NO_WRITE_RETRIES
        });

        return {
            success: true,
            message: 'Email sent successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
