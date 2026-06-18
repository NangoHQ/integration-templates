import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    messageId: z.string().describe('Message ID to mark as unread. Example: "1781108289537154100"')
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    })
});

const OutputSchema = z.object({
    success: z.boolean()
});

function getMailBaseUrl(extension: string | undefined): string {
    switch (extension) {
        case 'eu':
            return 'https://mail.zoho.eu';
        case 'in':
            return 'https://mail.zoho.in';
        case 'com.au':
        case 'au':
            return 'https://mail.zoho.com.au';
        case 'com':
        default:
            return 'https://mail.zoho.com';
    }
}

const action = createAction({
    description: 'Mark a Zoho Mail message as unread.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const extension = connection.connection_config?.['extension'];
        const baseUrl = getMailBaseUrl(extension);

        // https://www.zoho.com/mail/help/api/put-mark-email-as-unread.html
        const response = await nango.put({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            baseUrlOverride: baseUrl,
            data: {
                mode: 'markAsUnread',
                messageId: [input.messageId]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (providerResponse.success && providerResponse.data.status) {
            return {
                success: providerResponse.data.status.code === 200
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response from Zoho Mail API'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
