import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('The ID of the Trello card. Example: "6a26f2fdbc520ab9f45a5214"'),
    attachmentId: z.string().describe('The ID of the attachment. Example: "6a26f33c2f4cc3d61199de43"')
});

const ProviderAttachmentSchema = z
    .object({
        id: z.string(),
        bytes: z.union([z.string(), z.number()]).nullable().optional(),
        date: z.string().optional(),
        edgeColor: z.string().nullable().optional(),
        idMember: z.string().optional(),
        isUpload: z.boolean().optional(),
        mimeType: z.string().nullable().optional(),
        name: z.string().optional(),
        previews: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        scaled: z.boolean().optional(),
                        url: z.string().optional(),
                        bytes: z.number().optional(),
                        height: z.number().optional(),
                        width: z.number().optional()
                    })
                    .passthrough()
            )
            .optional(),
        url: z.string().optional(),
        pos: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    bytes: z.number().optional(),
    date: z.string().optional(),
    edgeColor: z.string().optional(),
    idMember: z.string().optional(),
    isUpload: z.boolean().optional(),
    mimeType: z.string().optional(),
    name: z.string().optional(),
    previews: z
        .array(
            z
                .object({
                    id: z.string().optional(),
                    scaled: z.boolean().optional(),
                    url: z.string().optional(),
                    bytes: z.number().optional(),
                    height: z.number().optional(),
                    width: z.number().optional()
                })
                .passthrough()
        )
        .optional(),
    url: z.string().optional(),
    pos: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single attachment from a Trello card.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-attachment',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-idattachment-get
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/attachments/${encodeURIComponent(input.attachmentId)}`,
            retries: 3
        });

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            id: providerAttachment.id,
            ...(providerAttachment.bytes != null && { bytes: Number(providerAttachment.bytes) }),
            ...(providerAttachment.date !== undefined && { date: providerAttachment.date }),
            ...(providerAttachment.edgeColor != null && { edgeColor: providerAttachment.edgeColor }),
            ...(providerAttachment.idMember !== undefined && { idMember: providerAttachment.idMember }),
            ...(providerAttachment.isUpload !== undefined && { isUpload: providerAttachment.isUpload }),
            ...(providerAttachment.mimeType != null && { mimeType: providerAttachment.mimeType }),
            ...(providerAttachment.name !== undefined && { name: providerAttachment.name }),
            ...(providerAttachment.previews !== undefined && { previews: providerAttachment.previews }),
            ...(providerAttachment.url !== undefined && { url: providerAttachment.url }),
            ...(providerAttachment.pos !== undefined && { pos: providerAttachment.pos })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
