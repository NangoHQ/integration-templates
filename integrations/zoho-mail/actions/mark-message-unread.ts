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
    status: z.object({
        code: z.number(),
        description: z.string()
    })
});

const action = createAction({
    description: 'Mark a Zoho Mail message as unread.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/mark-message-unread',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/mail/help/api/put-mark-email-as-unread.html
        const response = await nango.put({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            data: {
                mode: 'markAsUnread',
                messageId: [input.messageId]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
