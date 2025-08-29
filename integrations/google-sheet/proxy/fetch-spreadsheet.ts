import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

interface Spreadsheet {
    spreadsheetId: string;
    properties: Record<string, any>;
    sheets: Record<string, any>[];
    namedRanges: Record<string, any>[];
    spreadsheetUrl: string;
    developerMetadata: Record<string, any>[];
    dataSources: Record<string, any>[];
    dataSourceSchedules: Record<string, any>[];
}

/**
 * Fetch google spreadsheet
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { id: string }): Promise<Spreadsheet> {
    // Fetch the sheet content from Google Sheets API
    const config = {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        endpoint: `/v4/spreadsheets/${input.id}`,
        params: {
            includeGridData: 'true'
        },
        retries: 3
    };

    const response = await nango.get<Spreadsheet>(config);

    if (response.status !== 200) {
        Error(`Failed to fetch document: Status Code ${response.status}`);
    }

    return response.data;
}

const sheetId = { id: 'your-sheet-id' };

await run(sheetId);
