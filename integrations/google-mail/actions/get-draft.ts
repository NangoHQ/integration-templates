import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the draft to retrieve. Example: "r-1234567890"'),
    userId: z.string().optional().describe('The user\'s email address. Special value "me" can be used to indicate the authenticated user. Defaults to "me".')
});

const MessagePartBodySchema = z.object({
    attachmentId: z.string().optional(),
    size: z.number().optional(),
    data: z.string().optional()
});

const MessageHeaderSchema = z.object({
    name: z.string(),
    value: z.string()
});

const MessagePartSchema = z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(MessageHeaderSchema).optional(),
    body: MessagePartBodySchema.optional(),
    parts: z.array(z.unknown()).optional()
});

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

const DraftResponseSchema = z.object({
    id: z.string(),
    message: MessageSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    message: z
        .object({
            id: z.string().optional(),
            threadId: z.string().optional(),
            labelIds: z.array(z.string()).optional(),
            snippet: z.string().optional(),
            historyId: z.string().optional(),
            internalDate: z.string().optional(),
            payload: z
                .object({
                    partId: z.string().optional(),
                    mimeType: z.string().optional(),
                    filename: z.string().optional(),
                    headers: z.array(MessageHeaderSchema).optional(),
                    body: MessagePartBodySchema.optional(),
                    parts: z.array(z.unknown()).optional()
                })
                .optional(),
            sizeEstimate: z.number().optional(),
            raw: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a draft and its embedded message payload.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';
        const encodedId = encodeURIComponent(input.id);

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/get
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/drafts/${encodedId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Draft not found',
                id: input.id
            });
        }

        const raw = DraftResponseSchema.parse(response.data);

        return {
            id: raw.id,
            ...(raw.message && {
                message: {
                    id: raw.message.id,
                    threadId: raw.message.threadId,
                    labelIds: raw.message.labelIds,
                    snippet: raw.message.snippet,
                    historyId: raw.message.historyId,
                    internalDate: raw.message.internalDate,
                    payload: raw.message.payload && {
                        partId: raw.message.payload.partId,
                        mimeType: raw.message.payload.mimeType,
                        filename: raw.message.payload.filename,
                        headers: raw.message.payload.headers,
                        body: raw.message.payload.body && {
                            attachmentId: raw.message.payload.body.attachmentId,
                            size: raw.message.payload.body.size,
                            data: raw.message.payload.body.data
                        },
                        parts: raw.message.payload.parts
                    },
                    sizeEstimate: raw.message.sizeEstimate,
                    raw: raw.message.raw
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
