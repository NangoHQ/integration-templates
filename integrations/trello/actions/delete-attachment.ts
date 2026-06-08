import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('The ID of the card. Example: "5f3d9e4e3f4e3f4e3f4e3f4e"'),
    attachmentId: z.string().describe('The ID of the attachment. Example: "5f3d9e4e3f4e3f4e3f4e3f4e"')
});

const ProviderAttachmentSchema = z
    .object({
        id: z.string().optional(),
        bytes: z.number().nullable().optional(),
        date: z.string().optional(),
        edgeColor: z.string().nullable().optional(),
        idMember: z.string().optional(),
        isUpload: z.boolean().optional(),
        mimeType: z.string().nullable().optional(),
        name: z.string().optional(),
        previews: z.array(z.unknown()).optional(),
        url: z.string().optional(),
        pos: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Delete an attachment from a Trello card',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-idattachment-delete
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/attachments/${encodeURIComponent(input.attachmentId)}`,
            retries: 1
        });

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            id: providerAttachment.id || input.attachmentId,
            ...(providerAttachment.name !== undefined && { name: providerAttachment.name }),
            ...(providerAttachment.url !== undefined && { url: providerAttachment.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
