import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    spreadsheetId: z.string().describe('Google Spreadsheet ID. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"'),
    sheetName: z.string().optional().describe('Sheet/worksheet name. Defaults to first sheet if not provided. Example: "Sheet1"'),
    range: z.string().optional().describe('Cell range to sync. Defaults to entire sheet if not provided. Example: "A1:Z1000"')
});

const RowSchema = z.object({
    id: z.string(),
    rowIndex: z.number(),
    values: z.array(z.any())
});

const sync = createSync({
    description: 'Sync worksheet rows from a Google Sheet',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/rows', group: 'Sheets' }],
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,

    models: {
        Row: RowSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.spreadsheetId) {
            throw new Error('spreadsheet_id is required in metadata.');
        }

        const spreadsheetId = metadata.spreadsheetId;
        const sheetName = metadata.sheetName || '';
        const range = metadata.range || '';

        // Build the range string in A1 notation
        // If sheet_name is provided, use "SheetName!Range" format
        // If only sheet_name, use "SheetName" format (will get all cells with data)
        // Otherwise default to entire spreadsheet
        const rangeParam = sheetName && range ? `${sheetName}!${range}` : sheetName ? `${sheetName}` : '';

        await nango.trackDeletesStart('Row');

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
        const response = await nango.get<{
            range: string;
            majorDimension: string;
            values?: Array<Array<unknown>>;
        }>({
            endpoint: rangeParam
                ? `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeParam)}`
                : `/v4/spreadsheets/${spreadsheetId}/values/Sheet1`,
            params: {
                valueRenderOption: 'FORMATTED_VALUE'
            },
            retries: 3
        });

        const values = response.data.values || [];
        let rowIndex = 0;
        const records: Array<z.infer<typeof RowSchema>> = [];

        for (const row of values) {
            rowIndex++;

            // Create a stable ID using spreadsheet ID, sheet name, and row index
            const id = `${spreadsheetId}_${sheetName || 'default'}_${rowIndex}`;

            records.push({
                id,
                rowIndex: rowIndex,
                values: row
            });

            // Batch save in chunks to avoid memory issues with large sheets
            if (records.length >= 100) {
                await nango.batchSave(records, 'Row');
                records.length = 0;
            }
        }

        // Save any remaining records
        if (records.length > 0) {
            await nango.batchSave(records, 'Row');
        }

        await nango.trackDeletesEnd('Row');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
