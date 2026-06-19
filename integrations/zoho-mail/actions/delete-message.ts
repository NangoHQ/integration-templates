import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID containing the message. Example: "4845214000000008008"'),
    messageId: z.string().describe('Message ID to delete. Example: "1781108289537154100"'),
    expunge: z.boolean().optional().describe('Pass true to permanently delete the message. Omit or pass false to move to Trash.')
});

const ProviderStatusSchema = z.object({
    code: z.number(),
    description: z.string()
});

const ProviderDeleteResponseSchema = z.object({
    status: ProviderStatusSchema,
    data: z
        .object({
            cId: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    code: z.number(),
    description: z.string(),
    cId: z.string().optional()
});

const action = createAction({
    description: 'Delete a message in Zoho Mail. Pass expunge=true to permanently delete; otherwise moves to Trash.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.ALL', 'ZohoMail.messages.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.expunge === true) {
            params['expunge'] = 'true';
        }

        // https://www.zoho.com/mail/help/api/delete-email.html
        const response = await nango.delete({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}/messages/${encodeURIComponent(input.messageId)}`,
            params,
            retries: 3
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        return {
            code: parsed.status.code,
            description: parsed.status.description,
            ...(parsed.data?.cId !== undefined && { cId: String(parsed.data.cId) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
