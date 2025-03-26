import type { NangoAction, ProxyConfiguration, IdEntity, JSONSpreadsheet } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<JSONSpreadsheet> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'The input must be an object with an "id" property.'
        });
    }

    // Fetch the sheet content from Google Sheets API
    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://sheets.googleapis.com',
        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
        endpoint: `/v4/spreadsheets/${input.id}`,
        params: {
            includeGridData: 'true'
        },
        retries: 3
    };

    const response = await nango.get<JSONSpreadsheet>(config);

    if (response.status !== 200) {
        throw new nango.ActionError(`Failed to fetch document: Status Code ${response.status}`);
    }

    return response.data;
}
