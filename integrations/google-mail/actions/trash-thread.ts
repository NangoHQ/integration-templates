import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    thread_id: z.string().describe('The ID of the thread to trash. Example: "18e0b4e6c8a0b9e2"')
});

// MessagePart is a recursive structure used for message payloads
// We use a permissive schema to avoid recursive type complexities
// while still allowing the data to pass through
const MessagePartSchema = z.object({}).passthrough();

const MessageSchema = z.object({
    id: z.string().optional(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: MessagePartSchema.optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const ProviderThreadSchema = z.object({
    id: z.string(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    messages: z.array(MessageSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    messages: z.array(MessageSchema).optional()
});

const action = createAction({
    description: 'Move a Gmail thread to trash.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/trash-thread',
        group: 'Threads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/trash
        const response = await nango.post({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(input.thread_id)}/trash`,
            retries: 10
        });

        const providerThread = ProviderThreadSchema.parse(response.data);

        return {
            id: providerThread.id,
            ...(providerThread.snippet !== undefined && { snippet: providerThread.snippet }),
            ...(providerThread.historyId !== undefined && { historyId: providerThread.historyId }),
            ...(providerThread.messages !== undefined && { messages: providerThread.messages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
