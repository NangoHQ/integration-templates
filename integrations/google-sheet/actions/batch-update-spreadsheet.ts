import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string(),
    requests: z.array(z.record(z.string(), z.unknown()))
});

const ReplySchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    spreadsheetId: z.string(),
    replies: z.array(ReplySchema),
    updatedRange: z.string().optional(),
    updatedCells: z.number().optional(),
    updatedColumns: z.number().optional(),
    updatedRows: z.number().optional()
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
            endpoint: `/v4/spreadsheets/${input.spreadsheetId}:batchUpdate`,
            data: {
                requests: input.requests
            },
            retries: 3
        });

        const result = response.data;

        return {
            spreadsheetId: result.spreadsheetId ?? input.spreadsheetId,
            replies: result.replies ?? [],
            updatedRange: result.updatedRange ?? undefined,
            updatedCells: result.updatedCells ?? undefined,
            updatedColumns: result.updatedColumns ?? undefined,
            updatedRows: result.updatedRows ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
