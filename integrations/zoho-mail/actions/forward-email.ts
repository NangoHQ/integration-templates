import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID containing the message. Example: "4845214000000008008"'),
    messageId: z.string().describe('Message ID to forward. Example: "1781108289537154100"'),
    fromAddress: z.string().describe('Sender email address. Example: "nangoapi@zohomail.com"'),
    toAddress: z.string().describe('Recipient email address. Example: "recipient@example.com"'),
    content: z.string().optional().describe('Optional custom body content for the forwarded message')
});

const ZohoMailStatusSchema = z.object({
    code: z.number().optional(),
    description: z.string().optional()
});

const ZohoMailForwardResponseSchema = z.object({
    data: z.record(z.string(), z.unknown()).optional(),
    status: ZohoMailStatusSchema.optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    code: z.number().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Forward an email in Zoho Mail',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['zohomail.messages.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        const connectionConfig = connection.connection_config;

        const rawCredentialsSchema = z.object({
            raw: z.record(z.string(), z.unknown())
        });

        let apiDomain: string | undefined;
        const parsedCredentials = rawCredentialsSchema.safeParse(credentials);
        if (parsedCredentials.success) {
            const raw = parsedCredentials.data.raw;
            if (typeof raw['api_domain'] === 'string') {
                apiDomain = raw['api_domain'];
            }
        }

        const extensionMap: Record<string, string> = {
            com: 'https://mail.zoho.com',
            eu: 'https://mail.zoho.eu',
            in: 'https://mail.zoho.in',
            'com.au': 'https://mail.zoho.com.au',
            jp: 'https://mail.zoho.jp',
            ca: 'https://mail.zohocloud.ca',
            'com.cn': 'https://mail.zoho.com.cn',
            ae: 'https://mail.zoho.ae',
            sa: 'https://mail.zoho.sa'
        };

        const extension = typeof connectionConfig === 'object' && connectionConfig !== null ? connectionConfig['extension'] : undefined;
        let baseUrl: string;
        if (typeof extension === 'string' && extensionMap[extension] !== undefined) {
            baseUrl = extensionMap[extension]!;
        } else if (typeof apiDomain === 'string') {
            const apisMatch = apiDomain.replace(/\/$/, '').match(/^https:\/\/www\.zohoapis\.([a-z.]+)$/);
            baseUrl = apisMatch ? `https://mail.zoho.${apisMatch[1]}` : 'https://mail.zoho.com';
        } else {
            baseUrl = 'https://mail.zoho.com';
        }

        const body: Record<string, unknown> = {
            fromAddress: input.fromAddress,
            toAddress: input.toAddress,
            action: 'forward'
        };

        if (input.content !== undefined) {
            body['content'] = input.content;
        }

        // https://www.zoho.com/mail/help/api/get-message-details.html
        const detailsResponse = await nango.get({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}/messages/${encodeURIComponent(input.messageId)}/details`,
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const ZohoMailDetailsSchema = z.object({
            data: z
                .object({
                    folderId: z.string().optional(),
                    subject: z.string().optional()
                })
                .optional(),
            status: ZohoMailStatusSchema.optional()
        });

        const parsedDetails = ZohoMailDetailsSchema.parse(detailsResponse.data);
        const folderId = parsedDetails.data?.folderId || input.folderId;
        const originalSubject = parsedDetails.data?.subject || '';

        // https://www.zoho.com/mail/help/api/get-message-content.html
        const contentResponse = await nango.get({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(input.messageId)}/content`,
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const ZohoMailContentSchema = z.object({
            data: z
                .object({
                    content: z.string().optional()
                })
                .optional(),
            status: ZohoMailStatusSchema.optional()
        });

        const parsedContent = ZohoMailContentSchema.parse(contentResponse.data);
        const originalContent = parsedContent.data?.content || '';

        const forwardSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
        const forwardContent =
            input.content !== undefined
                ? `${input.content}\n\n---------- Forwarded message ----------\n${originalContent}`
                : `---------- Forwarded message ----------\n${originalContent}`;

        // https://www.zoho.com/mail/help/api/post-send-an-email.html
        const response = await nango.post({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages`,
            baseUrlOverride: baseUrl,
            data: {
                fromAddress: input.fromAddress,
                toAddress: input.toAddress,
                subject: forwardSubject,
                content: forwardContent,
                mailFormat: 'plaintext'
            },
            retries: 3
        });

        const parsed = ZohoMailForwardResponseSchema.parse(response.data);
        const statusCode = parsed.status?.code;
        const success = statusCode === 200;

        return {
            success,
            ...(statusCode !== undefined && { code: statusCode }),
            ...(parsed.status?.description !== undefined && { description: parsed.status.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
