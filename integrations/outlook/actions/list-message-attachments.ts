import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The unique identifier of the message to list attachments for. Example: "AAMkAGVmMD..."')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    lastModifiedDateTime: z.string().optional(),
    name: z.string().optional(),
    contentType: z.string().optional(),
    size: z.number().optional(),
    isInline: z.boolean().optional(),
    contentId: z.string().optional(),
    contentLocation: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    lastModifiedDateTime: z.string().optional(),
    name: z.string().optional(),
    contentType: z.string().optional(),
    size: z.number().optional(),
    isInline: z.boolean().optional(),
    contentId: z.string().optional(),
    contentLocation: z.string().optional()
});

const ListOutputSchema = z.object({
    attachments: z.array(OutputSchema)
});

const action = createAction({
    description: 'List attachments on a message.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-message-attachments',
        group: 'Messages'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['Mail.Read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-list-attachments
        const response = await nango.get({
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}/attachments`,
            params: {
                $select: 'id,lastModifiedDateTime,name,contentType,size,isInline'
            },
            retries: 3
        });

        const attachmentsData = response.data?.value || [];

        const attachments = attachmentsData.map((attachment: z.infer<typeof ProviderAttachmentSchema>) => {
            const parsed = ProviderAttachmentSchema.parse(attachment);
            return {
                id: parsed.id,
                ...(parsed.lastModifiedDateTime !== undefined && {
                    lastModifiedDateTime: parsed.lastModifiedDateTime
                }),
                ...(parsed.name !== undefined && { name: parsed.name }),
                ...(parsed.contentType !== undefined && {
                    contentType: parsed.contentType
                }),
                ...(parsed.size !== undefined && { size: parsed.size }),
                ...(parsed.isInline !== undefined && {
                    isInline: parsed.isInline
                }),
                ...(parsed.contentId !== undefined && {
                    contentId: parsed.contentId
                }),
                ...(parsed.contentLocation !== undefined && {
                    contentLocation: parsed.contentLocation
                })
            };
        });

        return {
            attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
