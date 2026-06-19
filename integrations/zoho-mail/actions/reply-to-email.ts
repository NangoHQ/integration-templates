import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    messageId: z.string().describe('Message ID to reply to. Example: "1781108289537154100"'),
    fromAddress: z.string().describe('Sender email address. Example: "nangoapi@zohomail.com"'),
    toAddress: z.string().describe('Recipient email address. Example: "recipient@example.com"'),
    action: z.enum(['reply', 'replyall']).describe('Reply type: reply or replyall'),
    content: z.string().optional().describe('Email body content')
});

const ProviderResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string().optional()
        })
        .optional(),
    data: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    messageId: z.string().describe('ID of the sent reply message. Example: "1726208416259127700"'),
    subject: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    content: z.string().optional(),
    mailId: z.string().optional()
});

const action = createAction({
    description: 'Reply or reply-all to an email in Zoho Mail',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const credentials = getProperty(connection, 'credentials');
        const raw = getProperty(credentials, 'raw');
        const apiDomain = getProperty(raw, 'api_domain');
        const connectionConfig = getProperty(connection, 'connection_config');
        const apiDomainFromConfig = getProperty(connectionConfig, 'api_domain');
        const baseUrl = typeof apiDomain === 'string' ? apiDomain : typeof apiDomainFromConfig === 'string' ? apiDomainFromConfig : undefined;

        const endpoint = `/api/accounts/${encodeURIComponent(input.accountId)}/messages/${encodeURIComponent(input.messageId)}`;
        const data = {
            fromAddress: input.fromAddress,
            toAddress: input.toAddress,
            action: input.action,
            ...(input.content !== undefined && { content: input.content })
        };

        const response =
            baseUrl !== undefined
                ? await nango.post({
                      // https://www.zoho.com/mail/help/api/post-reply-to-an-email.html
                      endpoint,
                      baseUrlOverride: getMailBaseUrl(baseUrl),
                      data,
                      retries: 1
                  })
                : await nango.post({
                      // https://www.zoho.com/mail/help/api/post-reply-to-an-email.html
                      endpoint,
                      data,
                      retries: 1
                  });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status && providerResponse.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.status.description || `Zoho Mail API returned error code ${providerResponse.status.code}`,
                code: providerResponse.status.code
            });
        }

        const responseData = providerResponse.data;
        if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Mail API returned an unexpected response format.'
            });
        }

        const messageId = getProperty(responseData, 'messageId');
        if (typeof messageId !== 'string') {
            throw new nango.ActionError({
                type: 'missing_message_id',
                message: 'Zoho Mail API did not return a messageId for the reply.'
            });
        }

        const subject = getProperty(responseData, 'subject');
        const fromAddress = getProperty(responseData, 'fromAddress');
        const toAddress = getProperty(responseData, 'toAddress');
        const content = getProperty(responseData, 'content');
        const mailId = getProperty(responseData, 'mailId');

        return {
            messageId,
            ...(typeof subject === 'string' && { subject }),
            ...(typeof fromAddress === 'string' && { fromAddress }),
            ...(typeof toAddress === 'string' && { toAddress }),
            ...(typeof content === 'string' && { content }),
            ...(typeof mailId === 'string' && { mailId })
        };
    }
});

function getMailBaseUrl(apiDomain: string): string {
    const url = new URL(apiDomain);
    const hostname = url.hostname;

    if (hostname.startsWith('mail.zoho')) {
        return apiDomain;
    }

    const mailHostname = hostname.replace(/^www\.zohoapis/, 'mail.zoho').replace(/^www\.zoho/, 'mail.zoho');
    return `https://${mailHostname}`;
}

function getProperty(obj: unknown, key: string): unknown {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return undefined;
    }
    for (const [k, v] of Object.entries(obj)) {
        if (k === key) {
            return v;
        }
    }
    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
