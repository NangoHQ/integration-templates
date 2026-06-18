import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID containing the message. Example: "4845214000000008008"'),
    messageId: z.string().describe('Message ID to retrieve content for. Example: "1781108289537154100"')
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z
        .object({
            messageId: z.union([z.string(), z.number()]).optional(),
            content: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    messageId: z.string().optional(),
    content: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the full body content of a Zoho Mail message.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/mail/help/api/get-email-content.html
        const response = await nango.get({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}/messages/${encodeURIComponent(input.messageId)}/content`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.status.description,
                code: parsed.status.code
            });
        }

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message content not found',
                accountId: input.accountId,
                folderId: input.folderId,
                messageId: input.messageId
            });
        }

        return {
            ...(parsed.data.messageId !== undefined && { messageId: String(parsed.data.messageId) }),
            ...(parsed.data.content !== undefined && { content: parsed.data.content })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
