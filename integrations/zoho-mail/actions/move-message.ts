import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    messageId: z.string().describe('Message ID to move. Example: "1781108289537154100"'),
    targetFolderId: z.string().describe('Target folder ID. Example: "4845214000000010001"')
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
    messageId: z.string().optional(),
    targetFolderId: z.string().optional()
});

const action = createAction({
    description: 'Move a Zoho Mail message to another folder.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        const raw = credentials && 'raw' in credentials && credentials.raw !== null ? credentials.raw : undefined;
        const apiDomain = typeof raw?.api_domain === 'string' ? raw.api_domain : undefined;
        const extension = connection.connection_config?.['extension'];
        const extensionToMailBase: Record<string, string> = {
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
        let baseUrl: string;
        if (typeof extension === 'string' && extensionToMailBase[extension]) {
            baseUrl = extensionToMailBase[extension]!;
        } else if (typeof apiDomain === 'string') {
            const apisMatch = apiDomain.replace(/\/$/, '').match(/^https:\/\/www\.zohoapis\.([a-z.]+)$/);
            baseUrl = apisMatch ? (extensionToMailBase[apisMatch[1]!] ?? `https://mail.zoho.${apisMatch[1]}`) : 'https://mail.zoho.com';
        } else {
            baseUrl = 'https://mail.zoho.com';
        }

        const response = await nango.put({
            // https://www.zoho.com/mail/help/api/
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            baseUrlOverride: baseUrl,
            data: {
                mode: 'moveMessage',
                messageId: [input.messageId],
                destfolderId: input.targetFolderId
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data || {});
        const isSuccess = providerResponse.status?.code === 200 || !providerResponse.status;

        return {
            success: isSuccess,
            messageId: input.messageId,
            targetFolderId: input.targetFolderId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
