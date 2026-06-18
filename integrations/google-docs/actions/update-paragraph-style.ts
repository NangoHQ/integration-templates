import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number(),
    unit: z.string()
});

const RangeSchema = z.object({
    startIndex: z.number().int().min(0).describe('The zero-based start index of the range in UTF-16 code units.'),
    endIndex: z.number().int().min(0).describe('The zero-based end index of the range, exclusive.'),
    segmentId: z.string().optional().describe('The ID of the header, footer or footnote the range is in. Empty or omitted for the document body.'),
    tabId: z.string().optional().describe('The tab that the range is in. When omitted, applies to the first tab.')
});

const ParagraphStyleInputSchema = z.object({
    namedStyleType: z.string().optional().describe('The named style type, e.g. NORMAL_TEXT, HEADING_1, HEADING_2, TITLE.'),
    alignment: z.string().optional().describe('The alignment, e.g. START, CENTER, END, JUSTIFIED.'),
    lineSpacing: z.number().optional(),
    direction: z.string().optional().describe('The content direction, e.g. LEFT_TO_RIGHT, RIGHT_TO_LEFT.'),
    spacingMode: z.string().optional().describe('The spacing mode, e.g. UNSPECIFIED, NEVER_COLLAPSE, COLLAPSE_LISTS.'),
    spaceAbove: DimensionSchema.optional(),
    spaceBelow: DimensionSchema.optional(),
    indentFirstLine: DimensionSchema.optional(),
    indentStart: DimensionSchema.optional(),
    indentEnd: DimensionSchema.optional()
});

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to update.'),
    range: RangeSchema,
    fields: z.string().min(1).describe('A field mask of which paragraph style fields to update, e.g. "alignment,spaceAbove".'),
    paragraphStyle: ParagraphStyleInputSchema
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown())
});

const action = createAction({
    description: 'Update alignment, heading, spacing, or indentation for paragraphs in a range.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            requests: [
                {
                    updateParagraphStyle: {
                        range: {
                            startIndex: input.range.startIndex,
                            endIndex: input.range.endIndex,
                            ...(input.range.segmentId !== undefined && { segmentId: input.range.segmentId }),
                            ...(input.range.tabId !== undefined && { tabId: input.range.tabId })
                        },
                        fields: input.fields,
                        paragraphStyle: {
                            ...(input.paragraphStyle.namedStyleType !== undefined && { namedStyleType: input.paragraphStyle.namedStyleType }),
                            ...(input.paragraphStyle.alignment !== undefined && { alignment: input.paragraphStyle.alignment }),
                            ...(input.paragraphStyle.lineSpacing !== undefined && { lineSpacing: input.paragraphStyle.lineSpacing }),
                            ...(input.paragraphStyle.direction !== undefined && { direction: input.paragraphStyle.direction }),
                            ...(input.paragraphStyle.spacingMode !== undefined && { spacingMode: input.paragraphStyle.spacingMode }),
                            ...(input.paragraphStyle.spaceAbove !== undefined && { spaceAbove: input.paragraphStyle.spaceAbove }),
                            ...(input.paragraphStyle.spaceBelow !== undefined && { spaceBelow: input.paragraphStyle.spaceBelow }),
                            ...(input.paragraphStyle.indentFirstLine !== undefined && { indentFirstLine: input.paragraphStyle.indentFirstLine }),
                            ...(input.paragraphStyle.indentStart !== undefined && { indentStart: input.paragraphStyle.indentStart }),
                            ...(input.paragraphStyle.indentEnd !== undefined && { indentEnd: input.paragraphStyle.indentEnd })
                        }
                    }
                }
            ]
        };

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: requestBody,
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: parsed.documentId,
            replies: parsed.replies ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
