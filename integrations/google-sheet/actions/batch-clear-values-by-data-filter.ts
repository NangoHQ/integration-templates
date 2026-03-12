import { z } from 'zod';
import { createAction } from 'nango';

const GridRangeSchema = z.object({
    sheet_id: z.number().describe('The ID of the sheet. Example: 0'),
    start_row_index: z.number().optional().describe('The start row (inclusive). Optional for unbounded.'),
    end_row_index: z.number().optional().describe('The end row (exclusive). Optional for unbounded.'),
    start_column_index: z.number().optional().describe('The start column (inclusive). Optional for unbounded.'),
    end_column_index: z.number().optional().describe('The end column (exclusive). Optional for unbounded.')
});

const DeveloperMetadataLocationSchema = z.object({
    location_type: z.enum(['ROW', 'COLUMN', 'SHEET', 'SPREADSHEET']).optional(),
    dimension_range: z
        .object({
            sheet_id: z.number(),
            dimension: z.enum(['ROWS', 'COLUMNS']),
            start_index: z.number().optional(),
            end_index: z.number().optional()
        })
        .optional()
});

const DeveloperMetadataLookupSchema = z.object({
    metadata_id: z.number().optional(),
    metadata_key: z.string().optional(),
    metadata_value: z.string().optional(),
    location_matching_strategy: z.enum(['EXACT_LOCATION', 'INTERSECTING_LOCATION']).optional(),
    location: DeveloperMetadataLocationSchema.optional(),
    visibility: z.enum(['DOCUMENT', 'PROJECT']).optional()
});

const DataFilterSchema = z
    .object({
        a1_range: z.string().optional().describe('A1 notation range. Example: "Sheet1!A1:B10"'),
        grid_range: GridRangeSchema.optional(),
        developer_metadata_lookup: DeveloperMetadataLookupSchema.optional()
    })
    .refine(
        (data) => {
            const count = [data.a1_range, data.grid_range, data.developer_metadata_lookup].filter(Boolean).length;
            return count === 1;
        },
        {
            message: 'Exactly one of a1_range, grid_range, or developer_metadata_lookup must be provided'
        }
    );

const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to update. Example: "1abc123xyz"'),
    data_filters: z.array(DataFilterSchema).min(1).describe('The data filters used to determine which ranges to clear')
});

const OutputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
    cleared_ranges: z.array(z.string()).describe('The ranges that were cleared, in A1 notation')
});

const action = createAction({
    description: 'Clear values from ranges matching data filters, preserving formatting',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-clear-values-by-data-filter',
        group: 'Values'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchClearByDataFilter
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}/values:batchClearByDataFilter`,
            data: {
                dataFilters: input.data_filters.map((filter) => {
                    if (filter.a1_range) {
                        return { a1Range: filter.a1_range };
                    }
                    if (filter.grid_range) {
                        return {
                            gridRange: {
                                sheetId: filter.grid_range.sheet_id,
                                startRowIndex: filter.grid_range.start_row_index,
                                endRowIndex: filter.grid_range.end_row_index,
                                startColumnIndex: filter.grid_range.start_column_index,
                                endColumnIndex: filter.grid_range.end_column_index
                            }
                        };
                    }
                    if (filter.developer_metadata_lookup) {
                        const lookup = filter.developer_metadata_lookup;
                        return {
                            developerMetadataLookup: {
                                ...(lookup.metadata_id !== undefined && { metadataId: lookup.metadata_id }),
                                ...(lookup.metadata_key && { metadataKey: lookup.metadata_key }),
                                ...(lookup.metadata_value && { metadataValue: lookup.metadata_value }),
                                ...(lookup.location_matching_strategy && { locationMatchingStrategy: lookup.location_matching_strategy }),
                                ...(lookup.location && {
                                    location: {
                                        ...(lookup.location.location_type && { locationType: lookup.location.location_type }),
                                        ...(lookup.location.dimension_range && {
                                            dimensionRange: {
                                                sheetId: lookup.location.dimension_range.sheet_id,
                                                dimension: lookup.location.dimension_range.dimension,
                                                startIndex: lookup.location.dimension_range.start_index,
                                                endIndex: lookup.location.dimension_range.end_index
                                            }
                                        })
                                    }
                                }),
                                ...(lookup.visibility && { visibility: lookup.visibility })
                            }
                        };
                    }
                    return {};
                })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to clear values'
            });
        }

        return {
            spreadsheet_id: response.data.spreadsheetId,
            cleared_ranges: response.data.clearedRanges || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
