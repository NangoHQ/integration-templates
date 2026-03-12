import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"'),
    sheet_id: z.number().optional().describe('The sheet ID (0-based). Defaults to 0 if not provided. Example: 0'),
    column_index: z.number().describe('The zero-based column index where the new column will be inserted. Example: 2 to insert at column C'),
    inherit_from_before: z
        .boolean()
        .optional()
        .describe('If true, the new column inherits formatting from the previous column. If false or not set, inherits from the next column.')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    sheet_id: z.number(),
    column_index: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Insert a new column into a sheet',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-column',
        group: 'Sheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sheetId = input.sheet_id ?? 0;

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
        await nango.post({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}:batchUpdate`,
            data: {
                requests: [
                    {
                        insertDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'COLUMNS',
                                startIndex: input.column_index,
                                endIndex: input.column_index + 1
                            },
                            ...(input.inherit_from_before !== undefined && {
                                inheritFromBefore: input.inherit_from_before
                            })
                        }
                    }
                ]
            },
            retries: 3
        });

        return {
            spreadsheet_id: input.spreadsheet_id,
            sheet_id: sheetId,
            column_index: input.column_index,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
