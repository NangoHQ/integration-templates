import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID containing the message. Example: "4845214000000008008"'),
    messageId: z.string().describe('Message ID to retrieve. Example: "1781108289537154100"')
});

const ProviderMessageSchema = z.object({
    summary: z.string().optional(),
    sentDateInGMT: z.string().optional(),
    calendarType: z.number().optional(),
    subject: z.string().optional(),
    messageId: z.string().optional(),
    threadCount: z.string().optional(),
    flagid: z.string().optional(),
    status2: z.string().optional(),
    priority: z.string().optional(),
    hasInline: z.string().optional(),
    toAddress: z.string().optional(),
    folderId: z.string().optional(),
    ccAddress: z.string().optional(),
    threadId: z.string().optional(),
    hasAttachment: z.string().optional(),
    size: z.string().optional(),
    sender: z.string().optional(),
    receivedTime: z.string().optional(),
    fromAddress: z.string().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: ProviderMessageSchema
});

const OutputSchema = ProviderMessageSchema;

const action = createAction({
    description: "Retrieve a single message's details from Zoho Mail.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-email-meta-data.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}/messages/${encodeURIComponent(input.messageId)}/details`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Zoho Mail returned status ${providerResponse.status.code}: ${providerResponse.status.description}`
            });
        }

        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
