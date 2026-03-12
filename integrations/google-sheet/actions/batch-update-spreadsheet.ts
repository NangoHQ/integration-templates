import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheet_id: z.string(),
    requests: z.array(z.record(z.string(), z.unknown()))
});

const ReplySchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    replies: z.array(ReplySchema),
    updated_range: z.union([z.string(), z.null()]).optional(),
    updated_cells: z.union([z.number(), z.null()]).optional(),
    updated_columns: z.union([z.number(), z.null()]).optional(),
    updated_rows: z.union([z.number(), z.null()]).optional()
});

const action = createAction({
    description: 'Apply multiple updates to a spreadsheet in a single request',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-update-spreadsheet',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}:batchUpdate`,
            data: {
                requests: input.requests
            },
            retries: 10
        });

        const result = response.data;

        return {
            spreadsheet_id: result.spreadsheetId ?? input.spreadsheet_id,
            replies: result.replies ?? [],
            updated_range: result.updatedRange ?? null,
            updated_cells: result.updatedCells ?? null,
            updated_columns: result.updatedColumns ?? null,
            updated_rows: result.updatedRows ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
