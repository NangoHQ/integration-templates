import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    fromAddress: z.string().describe('Sender email address. Example: "user@zohomail.com"'),
    toAddress: z.string().describe('Recipient email address. Example: "recipient@example.com"'),
    subject: z.string().describe('Subject of the email. Example: "Meeting notes"'),
    content: z.string().describe('Body content of the email. Example: "Hello, please find the notes attached."'),
    mailFormat: z.enum(['html', 'plaintext']).describe('Format of the email content. Example: "html"'),
    ccAddress: z.string().optional().describe('Cc recipient email address.'),
    bccAddress: z.string().optional().describe('Bcc recipient email address.')
});

const ProviderResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string()
        })
        .optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Save an email as a draft in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-draft',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/mail/help/api/post-save-draft-template.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages`,
            data: {
                mode: 'draft',
                fromAddress: input.fromAddress,
                toAddress: input.toAddress,
                subject: input.subject,
                content: input.content,
                mailFormat: input.mailFormat,
                ...(input.ccAddress !== undefined && { ccAddress: input.ccAddress }),
                ...(input.bccAddress !== undefined && { bccAddress: input.bccAddress })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const statusCode = parsed.status?.code ?? response.status;
        const isSuccess = statusCode === 200 || statusCode === 201;

        if (!isSuccess) {
            throw new nango.ActionError({
                type: 'draft_create_failed',
                message: parsed.status?.description || 'Failed to create draft',
                statusCode: statusCode
            });
        }

        return {
            success: true,
            ...(parsed.status?.description && { message: parsed.status.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
