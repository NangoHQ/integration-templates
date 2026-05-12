import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The ID of the draft message to attach the file to. Example: "AQMkAGFk..."'),
    fileName: z.string().describe('The name of the file to attach. Example: "document.pdf"'),
    contentType: z.string().describe('The MIME type of the file. Example: "application/pdf"'),
    contentBytes: z.string().describe('The base64-encoded content of the file. Example: "JVBERi0xLjQK..."')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    contentType: z.string().optional(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    contentId: z.string().nullable().optional(),
    contentLocation: z.string().nullable().optional(),
    isInline: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    contentType: z.string().optional(),
    size: z.number().optional()
});

const action = createAction({
    description: 'Attach a file to a draft message. Note: 3 MB simple upload limit applies.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-message-attachment',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/message-post-attachments
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}/attachments`,
            data: {
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: input.fileName,
                contentType: input.contentType,
                contentBytes: input.contentBytes
            },
            retries: 3
        });

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            id: providerAttachment.id,
            name: providerAttachment.name,
            ...(providerAttachment.contentType !== undefined && { contentType: providerAttachment.contentType }),
            ...(providerAttachment.size !== undefined && { size: providerAttachment.size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
