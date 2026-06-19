import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the draft to send. Example: "r-1234567890"')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the sent message. Example: "1234567890abcdef"'),
    threadId: z.string().optional().describe('The ID of the thread the message belongs to. Example: "abcdef1234567890"'),
    labelIds: z.array(z.string()).optional().describe('List of label IDs applied to the message.'),
    snippet: z.string().optional().describe('A short snippet of the message content.'),
    historyId: z.string().optional().describe('The history ID of the message.'),
    internalDate: z.string().optional().describe('The internal date of the message in epoch milliseconds.'),
    sizeEstimate: z.number().optional().describe('Estimated size of the message in bytes.')
});

const action = createAction({
    description: 'Send an existing draft message',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/send
        const response = await nango.post({
            endpoint: '/gmail/v1/users/me/drafts/send',
            data: {
                id: input.id
            },
            retries: 3
        });

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
