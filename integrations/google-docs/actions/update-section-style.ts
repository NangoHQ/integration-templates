import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number(),
    unit: z.string()
});

const SectionColumnPropertiesSchema = z.object({
    paddingEnd: DimensionSchema.optional(),
    width: DimensionSchema.optional()
});

const SectionStyleInputSchema = z.object({
    marginTop: DimensionSchema.optional(),
    marginBottom: DimensionSchema.optional(),
    marginLeft: DimensionSchema.optional(),
    marginRight: DimensionSchema.optional(),
    marginHeader: DimensionSchema.optional(),
    marginFooter: DimensionSchema.optional(),
    pageNumberStart: z.number().optional(),
    useFirstPageHeaderFooter: z.boolean().optional(),
    flipPageOrientation: z.boolean().optional(),
    columnSeparatorStyle: z.string().optional(),
    contentDirection: z.string().optional(),
    columnProperties: z.array(SectionColumnPropertiesSchema).optional()
});

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    startIndex: z.number().describe('Start index of the range overlapping the sections to style.'),
    endIndex: z.number().describe('End index of the range overlapping the sections to style.'),
    sectionStyle: SectionStyleInputSchema.describe('The section style properties to update.'),
    fields: z.string().describe('Field mask specifying which fields to update. Example: "marginTop"')
});

const BatchUpdateResponseSchema = z.object({
    replies: z.array(z.object({}).passthrough()),
    documentId: z.string(),
    writeControl: z
        .object({
            requiredRevisionId: z.string().optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    replyCount: z.number().describe('Number of replies returned by the batch update.')
});

const action = createAction({
    description: 'Update section-level layout settings.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-section-style',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateSectionStyle: {
                            range: {
                                startIndex: input.startIndex,
                                endIndex: input.endIndex
                            },
                            sectionStyle: input.sectionStyle,
                            fields: input.fields
                        }
                    }
                ]
            },
            retries: 3
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: batchResponse.documentId,
            replyCount: batchResponse.replies.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
