import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: 4845214000000008002'),
    messageId: z.string().describe('Message ID to flag or unflag. Example: 1781108289537154100'),
    unflag: z.boolean().optional().describe('Set to true to unflag the message instead of flagging it.')
});

const ProviderResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    statusCode: z.number().optional(),
    statusDescription: z.string().optional()
});

const action = createAction({
    description: 'Flag or unflag a Zoho Mail message.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        const raw = credentials && 'raw' in credentials && credentials.raw !== null ? credentials.raw : undefined;
        const apiDomain = typeof raw?.api_domain === 'string' ? raw.api_domain : undefined;
        const mode = 'setFlag';
        const flagId = input.unflag === true ? 'flag_not_set' : 'important';
        const extension = connection.connection_config?.['extension'];
        const baseUrl = typeof extension === 'string' ? `https://mail.zoho.${extension}` : apiDomain;

        const response = await nango.put({
            // https://www.zoho.com/mail/help/api/set-flag-for-email.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            ...(baseUrl && { baseUrlOverride: baseUrl }),
            data: {
                mode: mode,
                messageId: [input.messageId],
                flagid: flagId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: response.status >= 200 && response.status < 300,
            statusCode: providerResponse.status?.code,
            statusDescription: providerResponse.status?.description
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
