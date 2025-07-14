import type { NangoAction, ProxyConfiguration, SpreadsheetId, Spreadsheet } from '../../models.js';

export default async function runAction(nango: NangoAction, input: SpreadsheetId): Promise<Spreadsheet> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'The input must be an object with an "id" property.'
        });
    }

    // Fetch the sheet content from Google Sheets API
    const config: ProxyConfiguration = {
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        endpoint: `/v4/spreadsheets/${input.id}`,
        params: {
            includeGridData: 'true'
        },
        retries: 3
    };

    const response = await nango.get<Spreadsheet>(config);

    if (response.status !== 200) {
        throw new nango.ActionError(`Failed to fetch document: Status Code ${response.status}`);
    }

    return response.data;
}
