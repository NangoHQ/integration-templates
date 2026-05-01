import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    threadId: z.string().describe('The ID of the thread to restore from trash. Example: "18abc123def456"')
});

const ProviderThreadSchema = z.object({
    id: z.string(),
    historyId: z.string().optional(),
    messages: z
        .array(
            z.object({
                id: z.string(),
                threadId: z.string().optional(),
                labelIds: z.array(z.string()).optional(),
                snippet: z.string().optional(),
                historyId: z.string().optional(),
                internalDate: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    historyId: z.string().optional(),
    messages: z
        .array(
            z.object({
                id: z.string(),
                threadId: z.string().optional(),
                labelIds: z.array(z.string()).optional(),
                snippet: z.string().optional(),
                historyId: z.string().optional(),
                internalDate: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Restore a trashed Gmail thread to the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/untrash-thread',
        group: 'Threads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://mail.google.com/'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/untrash
        const response = await nango.post({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(input.threadId)}/untrash`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Thread not found or could not be restored',
                threadId: input.threadId
            });
        }

        const providerThread = ProviderThreadSchema.parse(response.data);

        return {
            id: providerThread.id,
            ...(providerThread.historyId && { historyId: providerThread.historyId }),
            ...(providerThread.messages && { messages: providerThread.messages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
