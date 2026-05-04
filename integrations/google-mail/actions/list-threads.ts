import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    q: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    includeSpamTrash: z.boolean().optional(),
    maxResults: z.number().int().optional(),
    pageToken: z.string().optional()
});

const MessageSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    sizeEstimate: z.number().optional()
});

const ThreadSchema = z.object({
    id: z.string(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    messages: z.array(MessageSchema).optional()
});

const OutputSchema = z.object({
    threads: z.array(ThreadSchema).optional(),
    nextPageToken: z.string().optional(),
    resultSizeEstimate: z.number().optional()
});

const action = createAction({
    description: 'List conversation threads matching Gmail query and label filters.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-threads',
        group: 'Threads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list
        const params: Record<string, string | number | string[]> = {};

        if (input.q !== undefined) {
            params['q'] = input.q;
        }
        if (input.labelIds !== undefined) {
            params['labelIds'] = input.labelIds;
        }
        if (input.includeSpamTrash !== undefined) {
            params['includeSpamTrash'] = input.includeSpamTrash ? 'true' : 'false';
        }
        if (input.maxResults !== undefined) {
            params['maxResults'] = input.maxResults;
        }
        if (input.pageToken !== undefined) {
            params['pageToken'] = input.pageToken;
        }

        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/threads',
            params,
            retries: 3
        });

        const ProviderMessageSchema = z.object({
            id: z.string(),
            threadId: z.string().optional(),
            labelIds: z.array(z.string()).optional(),
            snippet: z.string().optional(),
            historyId: z.string().optional(),
            internalDate: z.string().optional(),
            payload: z.record(z.string(), z.unknown()).optional(),
            sizeEstimate: z.number().optional()
        });

        const ProviderThreadSchema = z.object({
            id: z.string(),
            snippet: z.string().optional(),
            historyId: z.string().optional(),
            messages: z.array(ProviderMessageSchema).optional()
        });

        const ProviderListResponseSchema = z.object({
            threads: z.array(ProviderThreadSchema).optional(),
            nextPageToken: z.string().optional(),
            resultSizeEstimate: z.number().optional()
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            threads: parsed.threads?.map((thread) => ({
                id: thread.id,
                ...(thread.snippet !== undefined && { snippet: thread.snippet }),
                ...(thread.historyId !== undefined && { historyId: thread.historyId }),
                ...(thread.messages !== undefined && {
                    messages: thread.messages.map((msg) => ({
                        id: msg.id,
                        ...(msg.threadId !== undefined && { threadId: msg.threadId }),
                        ...(msg.labelIds !== undefined && { labelIds: msg.labelIds }),
                        ...(msg.snippet !== undefined && { snippet: msg.snippet }),
                        ...(msg.historyId !== undefined && { historyId: msg.historyId }),
                        ...(msg.internalDate !== undefined && { internalDate: msg.internalDate }),
                        ...(msg.payload !== undefined && { payload: msg.payload }),
                        ...(msg.sizeEstimate !== undefined && { sizeEstimate: msg.sizeEstimate })
                    }))
                })
            })),
            ...(parsed.nextPageToken !== undefined && { nextPageToken: parsed.nextPageToken }),
            ...(parsed.resultSizeEstimate !== undefined && { resultSizeEstimate: parsed.resultSizeEstimate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
