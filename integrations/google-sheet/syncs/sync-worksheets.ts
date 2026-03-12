import { createSync } from 'nango';
import { z } from 'zod';

const WorksheetSchema = z.object({
    id: z.string().describe('Unique identifier for the worksheet (sheetId)'),
    spreadsheet_id: z.string().describe('ID of the parent spreadsheet'),
    title: z.string().describe('Title of the worksheet'),
    index: z.number().describe('Zero-based index of the worksheet within the spreadsheet'),
    sheet_type: z.string().describe('Type of the sheet (GRID, OBJECT, etc.)'),
    row_count: z.number().optional().describe('Number of rows in the grid (for GRID sheets)'),
    column_count: z.number().optional().describe('Number of columns in the grid (for GRID sheets)'),
    hidden: z.boolean().optional().describe('Whether the sheet is hidden')
});

const MetadataSchema = z.object({
    spreadsheet_id: z.string().describe('Google Sheets spreadsheet ID to sync worksheets from')
});

const sync = createSync({
    description: 'Sync worksheets from a Google Sheets spreadsheet',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/sync-worksheets',
            group: 'Worksheets'
        }
    ],
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,

    models: {
        Worksheet: WorksheetSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const spreadsheetId = metadata?.spreadsheet_id;

        if (!spreadsheetId) {
            throw new Error('spreadsheet_id is required in metadata.');
        }

        await nango.trackDeletesStart('Worksheet');

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${spreadsheetId}`,
            params: {
                fields: 'spreadsheetId,properties.title,sheets.properties'
            },
            retries: 3
        });

        const spreadsheet = response.data;

        if (!spreadsheet || !spreadsheet.sheets) {
            throw new Error('Failed to fetch worksheets from spreadsheet');
        }

        const records = spreadsheet.sheets.map((sheet: any) => {
            const properties = sheet.properties || {};
            const gridProperties = properties.gridProperties || {};

            return {
                id: String(properties.sheetId),
                spreadsheet_id: spreadsheet.spreadsheetId,
                title: properties.title || '',
                index: properties.index ?? 0,
                sheet_type: properties.sheetType || 'GRID',
                row_count: gridProperties.rowCount,
                column_count: gridProperties.columnCount,
                hidden: properties.hidden ?? false
            };
        });

        if (records.length > 0) {
            await nango.batchSave(records, 'Worksheet');
        }

        await nango.trackDeletesEnd('Worksheet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
