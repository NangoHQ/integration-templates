import { z } from 'zod';
import { createAction } from 'nango';

const GridRangeSchema = z.object({
    sheetId: z.number().optional(),
    startRowIndex: z.number().optional(),
    endRowIndex: z.number().optional(),
    startColumnIndex: z.number().optional(),
    endColumnIndex: z.number().optional()
});

const DeveloperMetadataLookupSchema = z.object({
    locationType: z.enum(['SPREADSHEET', 'SHEET', 'ROW', 'COLUMN']).optional(),
    metadataLocation: z.object({}).passthrough().optional(),
    locationMatchingStrategy: z.enum(['EXACT_LOCATION', 'INTERSECTING_LOCATION']).optional(),
    metadataId: z.number().optional(),
    metadataKey: z.string().optional(),
    metadataValue: z.string().optional(),
    visibility: z.enum(['DOCUMENT', 'PROJECT']).optional()
});

const DataFilterSchema = z.object({
    a1Range: z.string().optional().describe('Selects data that matches the specified A1 range. Example: "Sheet1!A1:B2"'),
    gridRange: GridRangeSchema.optional().describe('Selects data that matches the range described by the GridRange'),
    developerMetadataLookup: DeveloperMetadataLookupSchema.optional().describe('Selects data associated with the developer metadata matching the criteria')
});

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to retrieve data from'),
    data_filters: z.array(DataFilterSchema).min(1).describe('The data filters used to match the ranges of values to retrieve'),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional().describe('The major dimension that results should use. Default: ROWS'),
    valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .optional()
        .describe('How values should be represented in the output. Default: FORMATTED_VALUE'),
    dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .describe('How dates, times, and durations should be represented in the output. Default: SERIAL_NUMBER')
});

const ValueRangeSchema = z.object({
    range: z.string().optional(),
    majorDimension: z.enum(['ROWS', 'COLUMNS']).optional(),
    values: z.array(z.array(z.unknown())).optional()
});

const MatchedValueRangeSchema = z.object({
    valueRange: ValueRangeSchema.optional(),
    dataFilters: z.array(DataFilterSchema).optional()
});

const OutputSchema = z.object({
    spreadsheetId: z.string(),
    valueRanges: z.array(MatchedValueRangeSchema).optional()
});

const action = createAction({
    description: 'Get values from ranges matching data filters',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-get-values-by-data-filter',
        group: 'Values'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            dataFilters: input.data_filters
        };

        if (input.majorDimension) {
            requestBody['majorDimension'] = input.majorDimension;
        }

        if (input.valueRenderOption) {
            requestBody['valueRenderOption'] = input.valueRenderOption;
        }

        if (input.dateTimeRenderOption) {
            requestBody['dateTimeRenderOption'] = input.dateTimeRenderOption;
        }

        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGetByDataFilter
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}/values:batchGetByDataFilter`,
            data: requestBody,
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
