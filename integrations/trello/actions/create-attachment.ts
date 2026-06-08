import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('The ID of the card to attach to. Example: "5abbe4b7ddc1b351ef961414"'),
    name: z.string().optional().describe('The name of the attachment. Example: "Nango Docs"'),
    url: z.string().describe('The URL of the attachment. Example: "https://docs.nango.dev"'),
    mimeType: z.string().optional().describe('The MIME type of the attachment. Example: "text/html"')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    bytes: z.string().nullable().optional(),
    date: z.string().optional(),
    edgeColor: z.string().nullable().optional(),
    idMember: z.string().optional(),
    isUpload: z.boolean().optional(),
    mimeType: z.string().nullable().optional(),
    name: z.string().optional(),
    previews: z.array(z.unknown()).optional(),
    url: z.string().optional(),
    pos: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    mimeType: z.string().optional(),
    date: z.string().optional(),
    isUpload: z.boolean().optional(),
    pos: z.number().optional()
});

const action = createAction({
    description: 'Create an attachment on a Trello card.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-attachment',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-post
        const response = await nango.post({
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/attachments`,
            params: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.mimeType !== undefined && { mimeType: input.mimeType }),
                url: input.url
            },
            retries: 3
        });

        let attachmentData: unknown;
        if (Array.isArray(response.data)) {
            attachmentData = response.data[0];
        } else {
            attachmentData = response.data;
        }

        const attachment = ProviderAttachmentSchema.parse(attachmentData);

        return {
            id: attachment.id,
            ...(attachment.name !== undefined && { name: attachment.name }),
            ...(attachment.url !== undefined && { url: attachment.url }),
            ...(attachment.mimeType !== undefined && attachment.mimeType !== null && { mimeType: attachment.mimeType }),
            ...(attachment.date !== undefined && { date: attachment.date }),
            ...(attachment.isUpload !== undefined && { isUpload: attachment.isUpload }),
            ...(attachment.pos !== undefined && { pos: attachment.pos })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
