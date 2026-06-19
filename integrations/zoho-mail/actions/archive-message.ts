import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    messageId: z.string().describe('Message ID to archive. Example: "1781108289537154100"')
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
    messageId: z.string().optional()
});

const action = createAction({
    description: 'Archive a Zoho Mail message.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.zoho.com/mail/help/api/put-archive-email.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/updatemessage`,
            data: {
                mode: 'archiveMails',
                messageId: [input.messageId]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const success = providerResponse.status?.code === 200;

        return {
            success,
            messageId: input.messageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
