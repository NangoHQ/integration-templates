import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the table. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        tableObjectId: z.string().describe('The object ID of the table to delete a row from. Example: "my_table_1"'),
        cellLocation: z
            .object({
                rowIndex: z
                    .number()
                    .int()
                    .nonnegative()
                    .describe('Zero-based row index of the reference cell. The row containing this cell is deleted. Example: 0'),
                columnIndex: z.number().int().nonnegative().describe('Zero-based column index of the reference cell. Example: 0')
            })
            .describe('A cell inside the table; the row containing this cell is the one that gets deleted.')
    })
    .describe('Identifies the table row to delete via a reference cell inside that row.');

const ProviderResponseSchema = z.object({
    presentationId: z.string().optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        tableObjectId: z.string().describe('The object ID of the table the row was deleted from.'),
        success: z.boolean().describe('True when the Google Slides API accepted the deleteTableRow request.')
    })
    .describe('Result of the batchUpdate that deleted the table row.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the presentation by deleting an entire table row and its cell contents via batchUpdate; the deletion cannot be undone.
 * @pitfalls: rowIndex and columnIndex are zero-based; the deletion is permanent with no undo, and the reply is an empty object, so a successful response confirms acceptance but does not echo the removed row.
 */
const action = createAction({
    description: 'Delete the table row containing a reference cell.',
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
                        deleteTableRow: {
                            tableObjectId: input.tableObjectId,
                            cellLocation: {
                                rowIndex: input.cellLocation.rowIndex,
                                columnIndex: input.cellLocation.columnIndex
                            }
                        }
                    }
                ]
            },
            // Non-idempotent write: a retry after a lost response would delete a second (shifted-up) row.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            presentationId: providerResponse.presentationId ?? input.presentationId,
            tableObjectId: input.tableObjectId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
