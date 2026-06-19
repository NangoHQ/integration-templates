import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the message to untrash. Example: "1234567890abcdef"')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: z.object({}).passthrough().optional(),
    sizeEstimate: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    sizeEstimate: z.number().optional()
});

const action = createAction({
    description: 'Restore a trashed Gmail message to the mailbox.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/untrash
        const response = await nango.post({
            endpoint: `/gmail/v1/users/me/messages/${encodeURIComponent(input.id)}/untrash`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found or could not be restored from trash',
                id: input.id
            });
        }

        const message = ProviderMessageSchema.parse(response.data);

        return {
            id: message.id,
            ...(message.threadId !== undefined && { threadId: message.threadId }),
            ...(message.labelIds !== undefined && { labelIds: message.labelIds }),
            ...(message.snippet !== undefined && { snippet: message.snippet }),
            ...(message.historyId !== undefined && { historyId: message.historyId }),
            ...(message.internalDate !== undefined && { internalDate: message.internalDate }),
            ...(message.sizeEstimate !== undefined && { sizeEstimate: message.sizeEstimate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
