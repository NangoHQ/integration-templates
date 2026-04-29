import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the message to trash. Example: "16e69b9f7e6e0f8b"')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    sizeEstimate: z.number().optional()
});

const action = createAction({
    description: 'Move a Gmail message to trash',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/trash-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/trash
        const response = await nango.post({
            endpoint: `/gmail/v1/users/me/messages/${encodeURIComponent(input.id)}/trash`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found',
                id: input.id
            });
        }

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            threadId: providerMessage.threadId,
            ...(providerMessage.labelIds !== undefined && { labelIds: providerMessage.labelIds }),
            ...(providerMessage.snippet !== undefined && { snippet: providerMessage.snippet }),
            ...(providerMessage.historyId !== undefined && { historyId: providerMessage.historyId }),
            ...(providerMessage.internalDate !== undefined && { internalDate: providerMessage.internalDate }),
            ...(providerMessage.sizeEstimate !== undefined && { sizeEstimate: providerMessage.sizeEstimate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
