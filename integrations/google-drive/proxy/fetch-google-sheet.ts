import { Nango } from '@nangohq/node';

interface JSONSpreadsheet {
    spreadsheetId: string;
    properties: Record<string, any>
    sheets: object[]
    namedRanges: object[]
    spreadsheetUrl: string
    developerMetadata: object[]
    dataSources: object[]
    dataSourceSchedules: object[]
}

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch google sheet
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { id: string }): Promise<JSONSpreadsheet> {
    // Fetch the sheet content from Google Sheets API
    const config = {
        baseUrlOverride: 'https://sheets.googleapis.com',
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        endpoint: `/v4/spreadsheets/${input.id}`,
        params: {
            includeGridData: 'true'
        },
        retries: 3
        // connectionId: 'your-notion-connection-id'
        // providerConfigKey: 'notion'
    };

    const response = await nango.get<JSONSpreadsheet>(config);

    if (response.status !== 200) {
        throw new Error(`Failed to fetch document: Status Code ${response.status}`);
    }

    return response.data;
}

const documentId = { id: 'your-sheet-id' }; // Replace with your actual document ID

await run(documentId);
