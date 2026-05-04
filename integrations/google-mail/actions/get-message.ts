import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the message to retrieve. Example: "12345abc"'),
    format: z
        .enum(['full', 'metadata', 'minimal', 'raw'])
        .optional()
        .describe('The format to return the message in. Values: full, metadata, minimal, raw. Example: "full"'),
    metadataHeaders: z
        .array(z.string())
        .optional()
        .describe('When format is metadata, only include headers specified in this array. Example: ["Subject", "From"]')
});

const MessagePartBodySchema = z.object({
    attachmentId: z.string().optional(),
    size: z.number().optional(),
    data: z.string().optional()
});

const MessagePartSchema = z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z
        .array(
            z.object({
                name: z.string(),
                value: z.string()
            })
        )
        .optional(),
    body: MessagePartBodySchema.optional(),
    parts: z.array(z.unknown()).optional()
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: MessagePartSchema.optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: MessagePartSchema.optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a specific Gmail message with optional format selection.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, any> = {};

        if (input.format !== undefined) {
            params['format'] = input.format;
        }

        if (input.metadataHeaders !== undefined) {
            params['metadataHeaders'] = input.metadataHeaders;
        }

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
        const response = await nango.get({
            endpoint: `/gmail/v1/users/me/messages/${encodeURIComponent(input.id)}`,
            params,
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
            labelIds: providerMessage.labelIds,
            snippet: providerMessage.snippet,
            historyId: providerMessage.historyId,
            internalDate: providerMessage.internalDate,
            payload: providerMessage.payload,
            sizeEstimate: providerMessage.sizeEstimate,
            raw: providerMessage.raw
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
