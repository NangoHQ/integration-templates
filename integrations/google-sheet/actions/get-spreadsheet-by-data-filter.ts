import { z } from 'zod';
import { createAction } from 'nango';

const DataFilterSchema = z
    .object({
        developerMetadataLookup: z
            .object({
                locationType: z.enum(['SPREADSHEET', 'SHEET', 'ROW', 'COLUMN']).optional(),
                metadataLocation: z
                    .object({
                        spreadsheet: z.boolean().optional(),
                        sheetId: z.number().optional(),
                        dimensionRange: z
                            .object({
                                sheetId: z.number(),
                                dimension: z.enum(['ROWS', 'COLUMNS']),
                                startIndex: z.number().optional(),
                                endIndex: z.number().optional()
                            })
                            .optional()
                    })
                    .optional(),
                locationMatchingStrategy: z.enum(['EXACT_LOCATION', 'INTERSECTING_LOCATION']).optional(),
                metadataId: z.number().optional(),
                metadataKey: z.string().optional(),
                metadataValue: z.string().optional(),
                visibility: z.enum(['DOCUMENT', 'PROJECT']).optional()
            })
            .optional()
            .describe('Selects data associated with developer metadata'),
        a1Range: z.string().optional().describe('Selects data matching A1 range notation (e.g., "Sheet1!A1:C10")'),
        gridRange: z
            .object({
                sheetId: z.number().optional(),
                startRowIndex: z.number().optional(),
                endRowIndex: z.number().optional(),
                startColumnIndex: z.number().optional(),
                endColumnIndex: z.number().optional()
            })
            .optional()
            .describe('Selects data matching a GridRange')
    })
    .describe('Filter to select which ranges to retrieve from the spreadsheet');

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to retrieve. Example: "1a2b3c4d5e6f7g8h9i0j"'),
    data_filters: z.array(DataFilterSchema).describe('The data filters used to select which ranges to retrieve from the spreadsheet'),
    include_grid_data: z.boolean().optional().describe('True if grid data should be returned. Ignored if a field mask is set in the request'),
    exclude_tables_in_banded_ranges: z.boolean().optional().describe('True if tables should be excluded in the banded ranges')
});

const OutputSchema = z.unknown().describe('Spreadsheet object with data matching the specified filters');

const action = createAction({
    description: 'Get spreadsheet data matching data filters',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-spreadsheet-by-data-filter',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            dataFilters: input.data_filters,
            includeGridData: input.include_grid_data ?? false,
            excludeTablesInBandedRanges: input.exclude_tables_in_banded_ranges ?? false
        };

        const response = await nango.post({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}:getByDataFilter`,
            data: requestBody,
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
