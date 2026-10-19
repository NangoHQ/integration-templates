import { z } from 'zod';
import { createAction } from 'nango';

const CellLocationSchema = z.object({
    rowIndex: z.number().int().min(0).describe('Zero-based row index of the reference cell. Example: 0'),
    columnIndex: z.number().int().min(0).describe('Zero-based column index of the reference cell. Example: 1')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the Google Slides presentation. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        tableObjectId: z.string().describe('The object ID of the table to insert columns into. Example: "my_table_1"'),
        cellLocation: CellLocationSchema.describe('The reference cell next to which the new columns are inserted.'),
        insertRight: z
            .boolean()
            .optional()
            .describe('Whether to insert the new columns to the right of the reference cell. Defaults to false (insert to the left).'),
        number: z.number().int().min(1).max(20).describe('The number of columns to insert. Maximum 20 per request. Example: 1')
    })
    .describe('The table and reference cell where new columns should be inserted.');

const ProviderResponseSchema = z.object({
    presentationId: z.string()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was modified.')
    })
    .describe('The presentation that was modified by the inserted columns.');

/**
 * @tags: [write]
 * @tagReason: Inserts new columns into an existing table, mutating the presentation.
 * @pitfalls: Returns only the presentation ID, so re-read the slide to confirm the resulting column count; the provider automatically resizes existing columns to fit the newly inserted ones.
 */
const action = createAction({
    description: 'Insert one or more columns to the left or right of a reference cell in a table.',
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
                        insertTableColumns: {
                            tableObjectId: input.tableObjectId,
                            cellLocation: {
                                rowIndex: input.cellLocation.rowIndex,
                                columnIndex: input.cellLocation.columnIndex
                            },
                            insertRight: input.insertRight ?? false,
                            number: input.number
                        }
                    }
                ]
            },
            // Non-idempotent write: retrying after a lost response would insert duplicate columns.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            presentationId: providerResponse.presentationId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
