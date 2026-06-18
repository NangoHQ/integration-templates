import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the thread to retrieve. Example: "18e1a2b3c4d5e6f7"'),
    format: z
        .enum(['full', 'metadata', 'minimal'])
        .optional()
        .describe(
            'The format to return the messages in. "full" returns full email data, "metadata" returns only IDs, labels, and headers, "minimal" returns only IDs and labels.'
        ),
    metadataHeaders: z.array(z.string()).optional().describe('When given and format is METADATA, only include headers specified.')
});

const MessagePartBodySchema = z.object({
    attachmentId: z.string().optional(),
    data: z.string().optional(),
    size: z.number().optional()
});

const MessageHeaderSchema = z.object({
    name: z.string(),
    value: z.string()
});

// MessagePart can be deeply nested (multipart MIME), using unknown for nested parts
const MessagePartSchema = z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(MessageHeaderSchema).optional(),
    body: MessagePartBodySchema.optional(),
    parts: z.unknown().optional()
});

const MessageSchema = z.object({
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

const ThreadSchema = z.object({
    id: z.string(),
    historyId: z.string().optional(),
    messages: z.array(MessageSchema).optional(),
    snippet: z.string().optional()
});

const OutputSchema = ThreadSchema;

const action = createAction({
    description: 'Retrieve a Gmail thread and its messages.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get
        const response = await nango.get({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.format !== undefined && { format: input.format }),
                ...(input.metadataHeaders !== undefined &&
                    input.metadataHeaders.length > 0 && {
                        metadataHeaders: input.metadataHeaders
                    })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Thread not found',
                threadId: input.id
            });
        }

        const thread = ThreadSchema.parse(response.data);

        return thread;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
