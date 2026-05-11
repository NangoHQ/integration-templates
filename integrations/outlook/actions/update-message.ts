import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The unique identifier of the message to update. Example: "AAMkAGVmMDEz"'),
    subject: z.string().optional().describe('The subject of the message.'),
    body: z
        .object({
            contentType: z.enum(['text', 'html']).describe('The content type of the body.'),
            content: z.string().describe('The content of the body.')
        })
        .optional()
        .describe('The body of the message.'),
    categories: z.array(z.string()).optional().describe('The categories associated with the message.'),
    isRead: z.boolean().optional().describe('Indicates whether the message has been read.'),
    flag: z
        .object({
            flagStatus: z.enum(['notFlagged', 'complete', 'flagged']).describe('The flag status of the message.')
        })
        .optional()
        .describe('The flag status of the message.')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    body: z
        .object({
            contentType: z.string(),
            content: z.string()
        })
        .optional(),
    categories: z.array(z.string()).optional(),
    isRead: z.boolean().optional(),
    flag: z
        .object({
            flagStatus: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    body: z
        .object({
            contentType: z.string(),
            content: z.string()
        })
        .optional(),
    categories: z.array(z.string()).optional(),
    isRead: z.boolean().optional(),
    flag: z
        .object({
            flagStatus: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Update a draft or mutable message fields.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.subject !== undefined) {
            updateData['subject'] = input.subject;
        }
        if (input.body !== undefined) {
            updateData['body'] = input.body;
        }
        if (input.categories !== undefined) {
            updateData['categories'] = input.categories;
        }
        if (input.isRead !== undefined) {
            updateData['isRead'] = input.isRead;
        }
        if (input.flag !== undefined) {
            updateData['flag'] = input.flag;
        }

        // https://learn.microsoft.com/graph/api/message-update
        const response = await nango.patch({
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}`,
            data: updateData,
            retries: 3
        });

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            ...(providerMessage.subject !== undefined && { subject: providerMessage.subject }),
            ...(providerMessage.body !== undefined && { body: providerMessage.body }),
            ...(providerMessage.categories !== undefined && { categories: providerMessage.categories }),
            ...(providerMessage.isRead !== undefined && { isRead: providerMessage.isRead }),
            ...(providerMessage.flag !== undefined && { flag: providerMessage.flag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
