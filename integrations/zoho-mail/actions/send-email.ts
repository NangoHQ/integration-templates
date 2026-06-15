import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().min(1).describe('Account ID from which to send the email. Example: "4845214000000008002"'),
    fromAddress: z.string().min(1).describe('Sender email address. Example: "nangoapi@zohomail.com"'),
    toAddress: z.string().min(1).describe('Recipient email address(es). Example: "recipient@example.com"'),
    ccAddress: z.string().optional().describe('CC email address(es). Example: "cc@example.com"'),
    bccAddress: z.string().optional().describe('BCC email address(es). Example: "bcc@example.com"'),
    subject: z.string().min(1).describe('Email subject. Example: "Hello"'),
    content: z.string().min(1).describe('Email body content. Example: "Hello, world!"'),
    mailFormat: z.enum(['html', 'plaintext']).optional().describe('Email format: "html" or "plaintext". Example: "html"')
});

const ZohoStatusSchema = z.object({
    code: z.number(),
    description: z.string()
});

const ZohoSendEmailResponseSchema = z.object({
    status: ZohoStatusSchema.optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    statusCode: z.number().describe('HTTP status code from the API'),
    statusDescription: z.string().describe('Status description from the API'),
    data: z.unknown().optional().describe('Additional response data from the API')
});

const action = createAction({
    description: 'Send an email through Zoho Mail',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/send-email',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, string | undefined> = {
            fromAddress: input.fromAddress,
            toAddress: input.toAddress,
            subject: input.subject,
            content: input.content
        };

        if (input.ccAddress !== undefined) {
            body['ccAddress'] = input.ccAddress;
        }

        if (input.bccAddress !== undefined) {
            body['bccAddress'] = input.bccAddress;
        }

        if (input.mailFormat !== undefined) {
            body['mailFormat'] = input.mailFormat;
        }

        // https://www.zoho.com/mail/help/api/post-send-an-email.html
        const response = await nango.post({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages`,
            data: body,
            retries: 1
        });

        const parsed = ZohoSendEmailResponseSchema.parse(response.data);

        const statusCode = parsed.status?.code ?? response.status;
        const statusDescription = parsed.status?.description ?? 'unknown';

        return {
            statusCode,
            statusDescription,
            ...(parsed.data !== undefined && { data: parsed.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
