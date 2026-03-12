import { z } from 'zod';
import { createAction } from 'nango';

const SheetPropertiesSchema = z
    .object({
        title: z.string().optional().describe('Sheet title. Example: "Sheet1"'),
        gridProperties: z
            .object({
                rowCount: z.number().optional(),
                columnCount: z.number().optional()
            })
            .optional()
    })
    .passthrough();

const SheetSchema = z
    .object({
        properties: SheetPropertiesSchema.optional()
    })
    .passthrough();

const SpreadsheetPropertiesSchema = z
    .object({
        title: z.string().describe('Spreadsheet title. Example: "My New Spreadsheet"'),
        locale: z.string().optional().describe('Spreadsheet locale. Example: "en_US"'),
        timeZone: z.string().optional().describe('Spreadsheet time zone. Example: "America/New_York"')
    })
    .passthrough();

const InputSchema = z.object({
    properties: SpreadsheetPropertiesSchema.describe('Spreadsheet properties including title'),
    sheets: z.array(SheetSchema).optional().describe('Array of sheets to create in the spreadsheet')
});

const OutputSchema = z
    .object({
        spreadsheetId: z.string().describe('The unique ID of the created spreadsheet'),
        spreadsheetUrl: z.string().describe('The URL to view the spreadsheet in Google Sheets'),
        properties: z.any().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a new spreadsheet',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-spreadsheet',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/create
        const response = await nango.post({
            endpoint: '/v4/spreadsheets',
            data: {
                properties: input.properties,
                ...(input.sheets && { sheets: input.sheets })
            },
            retries: 3
        });

        return {
            spreadsheetId: response.data.spreadsheetId,
            spreadsheetUrl: response.data.spreadsheetUrl,
            properties: response.data.properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
