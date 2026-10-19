import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const TextRangeSchema = z.object({
    type: z
        .enum(['FIXED_RANGE', 'FROM_START_INDEX', 'ALL'])
        .describe(
            'How the text range is selected: FIXED_RANGE uses startIndex and endIndex, FROM_START_INDEX deletes from startIndex to the end, and ALL deletes the entire text.'
        ),
    startIndex: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('0-based inclusive start offset (in Unicode code units) of the text to delete. Required for FIXED_RANGE and FROM_START_INDEX.'),
    endIndex: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
            '0-based exclusive end offset (in Unicode code units) of the text to delete. Required for FIXED_RANGE and ignored for FROM_START_INDEX and ALL.'
        )
});

const CellLocationSchema = z.object({
    rowIndex: z.number().int().min(0).describe('0-based row index of the target table cell.'),
    columnIndex: z.number().int().min(0).describe('0-based column index of the target table cell.')
});

const InputSchema = z
    .object({
        presentationId: z
            .string()
            .describe('The ID of the presentation that contains the text to delete. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'),
        objectId: z.string().describe('The object ID of the shape, text box, or table whose text should be deleted.'),
        textRange: TextRangeSchema.describe('The range of text to delete within the target object.'),
        cellLocation: CellLocationSchema.optional().describe('The table cell to target when objectId refers to a table. Omit for shapes and text boxes.')
    })
    .describe('Parameters for deleting a range of text from a shape or table cell in a Google Slides presentation.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was modified.'),
        objectId: z.string().describe('The object ID of the shape or table cell whose text was deleted.'),
        success: z.boolean().describe('True when the provider accepted the delete-text request.')
    })
    .describe('Result of the delete-text request, reporting whether the provider accepted it.');

/**
 * @tags: [write, destructive]
 * @tagReason: Removes a range of text from a slide shape or table cell; the deletion is a provider-side mutation that cannot be undone through the API.
 * @pitfalls: Deletion is irreversible through the API, and success only means the provider accepted the request rather than confirming the text was removed, so re-read the slide to verify. Indices are 0-based code-unit offsets over the shape's full text including its mandatory trailing newline, and an out-of-range endIndex fails with a 400 that names the actual text length.
 */
const action = createAction({
    description: 'Delete a range of text from a shape or table cell.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const deleteText: {
            objectId: string;
            textRange: {
                type: string;
                startIndex?: number;
                endIndex?: number;
            };
            cellLocation?: {
                rowIndex: number;
                columnIndex: number;
            };
        } = {
            objectId: input.objectId,
            textRange: {
                type: input.textRange.type,
                ...(input.textRange.startIndex !== undefined && { startIndex: input.textRange.startIndex }),
                ...(input.textRange.endIndex !== undefined && { endIndex: input.textRange.endIndex })
            },
            ...(input.cellLocation !== undefined && {
                cellLocation: {
                    rowIndex: input.cellLocation.rowIndex,
                    columnIndex: input.cellLocation.columnIndex
                }
            })
        };

        const config: ProxyConfiguration = {
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ deleteText }]
            },
            // deleteText is not idempotent: a retry after a lost response would delete a different range because indices shift.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must be 0 for this non-idempotent write
            retries: 0
        };
        await nango.post(config);

        return {
            presentationId: input.presentationId,
            objectId: input.objectId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
