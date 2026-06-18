import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('The ID of the Trello card. Example: "5d0b4f5060d98f6d3f5c6a1a"'),
    filter: z.enum(['all', 'cover']).optional().describe('Filter for attachments. Valid values: all, cover.')
});

const PreviewSchema = z.object({
    id: z.string().optional(),
    bytes: z.number().optional(),
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    scaled: z.boolean().optional()
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    bytes: z.string().or(z.number()).nullable().optional(),
    date: z.string().optional(),
    edgeColor: z.string().nullable().optional(),
    idMember: z.string().optional(),
    isUpload: z.boolean().optional(),
    mimeType: z.string().nullable().optional(),
    name: z.string().optional(),
    pos: z.number().optional(),
    previews: z.array(PreviewSchema).optional(),
    url: z.string().optional()
});

const OutputAttachmentSchema = z.object({
    id: z.string(),
    bytes: z.number().optional(),
    date: z.string().optional(),
    edgeColor: z.string().nullable().optional(),
    idMember: z.string().optional(),
    isUpload: z.boolean().optional(),
    mimeType: z.string().nullable().optional(),
    name: z.string().optional(),
    pos: z.number().optional(),
    previews: z.array(PreviewSchema).optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    attachments: z.array(OutputAttachmentSchema)
});

const action = createAction({
    description: 'List attachments on a Trello card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-get
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/attachments`,
            params: {
                ...(input.filter !== undefined && input.filter !== 'all' && { filter: input.filter })
            },
            retries: 3
        });

        const providerAttachments = z.array(ProviderAttachmentSchema).parse(response.data);

        const attachments = providerAttachments.map((attachment) => ({
            id: attachment.id,
            ...(attachment.bytes !== undefined &&
                attachment.bytes !== null && {
                    bytes: typeof attachment.bytes === 'string' ? Number(attachment.bytes) : attachment.bytes
                }),
            ...(attachment.date !== undefined && { date: attachment.date }),
            ...(attachment.edgeColor !== undefined && { edgeColor: attachment.edgeColor }),
            ...(attachment.idMember !== undefined && { idMember: attachment.idMember }),
            ...(attachment.isUpload !== undefined && { isUpload: attachment.isUpload }),
            ...(attachment.mimeType !== undefined && { mimeType: attachment.mimeType }),
            ...(attachment.name !== undefined && { name: attachment.name }),
            ...(attachment.pos !== undefined && { pos: attachment.pos }),
            ...(attachment.previews !== undefined && { previews: attachment.previews }),
            ...(attachment.url !== undefined && { url: attachment.url })
        }));

        return {
            attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
