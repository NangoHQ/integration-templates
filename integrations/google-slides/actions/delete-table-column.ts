import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('Google Slides presentation ID. Example: "1XMjFrmrnGzfPhHQb0ZMc4YSKwLvyn0HckTRodgW6mGw"'),
        tableObjectId: z.string().describe('Object ID of the table to delete a column from. Example: "tbl_fixture_1"'),
        cellLocation: z
            .object({
                rowIndex: z.number().int().nonnegative().describe('Zero-based row index of the reference cell. Example: 0'),
                columnIndex: z
                    .number()
                    .int()
                    .nonnegative()
                    .describe('Zero-based column index of the reference cell. The column containing this cell is deleted. Example: 1')
            })
            .describe('A cell inside the table; the column containing this cell is the one that gets deleted.')
    })
    .describe('Reference cell identifying the table column to delete.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation whose table column was deleted.'),
        tableObjectId: z.string().describe('Object ID of the table the column was deleted from.'),
        success: z.boolean().describe('True when the Google Slides API accepted the deleteTableColumn request (HTTP 200).')
    })
    .describe('Result of deleting a table column.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a table column from a presentation via batchUpdate, a provider mutation that removes content and cannot be undone through the API.
 * @pitfalls: Deleting the reference cell's column shifts the indices of the remaining columns, so repeated calls with the same cellLocation target different columns; if the reference cell is merged, every column it spans is deleted; if no columns remain, the entire table is deleted; the API returns no per-request result, so a 200 confirms acceptance only.
 */
const action = createAction({
    description: 'Delete the table column containing a reference cell.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteTableColumn: {
                            tableObjectId: input.tableObjectId,
                            cellLocation: {
                                rowIndex: input.cellLocation.rowIndex,
                                columnIndex: input.cellLocation.columnIndex
                            }
                        }
                    }
                ]
            },
            // deleteTableColumn is not idempotent: after a lost response a retry would delete a different column once indices shift.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const batchResponse = BatchUpdateResponseSchema.safeParse(response.data);
        if (!batchResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from the Google Slides API',
                details: batchResponse.error.issues
            });
        }

        if (batchResponse.data.presentationId === undefined && batchResponse.data.replies === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from the Google Slides API'
            });
        }

        return {
            presentationId: input.presentationId,
            tableObjectId: input.tableObjectId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
