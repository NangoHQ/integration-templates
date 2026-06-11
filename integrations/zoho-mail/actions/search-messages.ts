import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    searchKey: z.string().describe('Zoho Mail search query string. Use syntax like "entire:keyword" or "subject:Meeting". Example: "entire:Test"'),
    start: z.number().optional().describe('Starting index for pagination. Example: 1'),
    limit: z.number().optional().describe('Number of results to return (1-200). Example: 10'),
    receivedTime: z.number().optional().describe('Unix timestamp in milliseconds to filter emails received before this time. Example: 1609459200000'),
    includeto: z.boolean().optional().describe('Whether to include the To field in the response. Example: true')
});

const ZohoMessageSchema = z.object({
    messageId: z.union([z.string(), z.number()]).optional(),
    folderId: z.union([z.string(), z.number()]).optional(),
    subject: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    sender: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    status2: z.string().optional(),
    receivedtime: z.union([z.string(), z.number()]).optional(),
    receivedTime: z.union([z.string(), z.number()]).optional(),
    sentDateInGMT: z.union([z.string(), z.number()]).optional(),
    hasAttachment: z.union([z.string(), z.number()]).optional(),
    threadId: z.union([z.string(), z.number()]).optional(),
    threadCount: z.union([z.string(), z.number()]).optional(),
    flagid: z.union([z.string(), z.number()]).optional(),
    priority: z.union([z.string(), z.number()]).optional(),
    size: z.union([z.string(), z.number()]).optional(),
    URI: z.string().optional()
});

const ZohoSearchResponseSchema = z.object({
    status: z
        .object({
            code: z.number().optional(),
            description: z.string().optional()
        })
        .optional(),
    data: z.array(z.unknown()).optional()
});

const MessageSchema = z.object({
    messageId: z.string().optional(),
    folderId: z.string().optional(),
    subject: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    sender: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    status2: z.string().optional(),
    receivedTime: z.string().optional(),
    sentDateInGMT: z.string().optional(),
    hasAttachment: z.union([z.string(), z.number()]).optional(),
    threadId: z.string().optional(),
    threadCount: z.string().optional(),
    flagid: z.union([z.string(), z.number()]).optional(),
    priority: z.string().optional(),
    size: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    count: z.number().optional()
});

function getMailBaseUrl(apiDomain: string): string {
    if (!apiDomain.startsWith('http')) {
        return 'https://mail.zoho.com';
    }
    const host = apiDomain.split('://')[1]?.split('/')[0];
    if (!host) {
        return 'https://mail.zoho.com';
    }
    if (host.startsWith('accounts.')) {
        return `https://mail.${host.slice('accounts.'.length)}`;
    }
    if (host.startsWith('mail.')) {
        return `https://${host}`;
    }
    if (host === 'www.zohoapis.com') {
        return 'https://mail.zoho.com';
    }
    if (host === 'www.zohoapis.eu') {
        return 'https://mail.zoho.eu';
    }
    if (host === 'www.zohoapis.in') {
        return 'https://mail.zoho.in';
    }
    if (host === 'www.zohoapis.com.au') {
        return 'https://mail.zoho.com.au';
    }
    return 'https://mail.zoho.com';
}

function coerceToString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value;
    }
    return String(value);
}

const action = createAction({
    description: 'Search emails in Zoho Mail by keyword.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/search-messages',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/mail/help/api/get-search-emails.html
        const connection = await nango.getConnection();
        const credentialsSchema = z.object({
            raw: z
                .object({
                    api_domain: z.string()
                })
                .optional()
        });
        const credentialsResult = credentialsSchema.safeParse(connection.credentials);
        const apiDomain = credentialsResult.success ? credentialsResult.data.raw?.api_domain : undefined;
        const baseUrl = apiDomain ? getMailBaseUrl(apiDomain) : 'https://mail.zoho.com';

        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-search-emails.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages/search`,
            params: {
                searchKey: input.searchKey,
                ...(input.start !== undefined && { start: input.start }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.receivedTime !== undefined && { receivedTime: input.receivedTime }),
                ...(input.includeto !== undefined && { includeto: input.includeto ? 'true' : 'false' })
            },
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const parsed = ZohoSearchResponseSchema.parse(response.data);
        const rawMessages = parsed.data ?? [];

        const messages = rawMessages
            .map((item) => {
                const msg = ZohoMessageSchema.safeParse(item);
                if (!msg.success) {
                    return null;
                }
                const data = msg.data;
                return {
                    messageId: coerceToString(data.messageId),
                    folderId: coerceToString(data.folderId),
                    subject: data.subject,
                    fromAddress: data.fromAddress,
                    toAddress: data.toAddress,
                    sender: data.sender,
                    summary: data.summary,
                    status: data.status,
                    status2: data.status2,
                    receivedTime: coerceToString(data.receivedtime ?? data.receivedTime),
                    sentDateInGMT: coerceToString(data.sentDateInGMT),
                    hasAttachment: data.hasAttachment,
                    threadId: coerceToString(data.threadId),
                    threadCount: coerceToString(data.threadCount),
                    flagid: data.flagid,
                    priority: coerceToString(data.priority),
                    size: coerceToString(data.size),
                    uri: data.URI
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        return {
            messages,
            count: messages.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
