import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    messageId: z.string().describe('Message ID to mark as read. Example: "1781108289537154100"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.string()).optional()
});

const ProviderResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string().optional()
        })
        .optional()
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
    description: 'Mark a Zoho Mail message as read',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/mark-message-read',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['zohomail.messages.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const extension = connection.connection_config?.['extension'];
        const baseUrl = getMailBaseUrl(extension);

        const response = await nango.put({
            // https://www.zoho.com/mail/help/api/
            baseUrlOverride: baseUrl,
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            data: {
                mode: 'markAsRead',
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

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
