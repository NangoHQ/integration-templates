import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { Spreadsheet, SpreadsheetId } from '../models.js';

const action = createAction({
    description: 'Fetches the content of a spreadsheet given its ID.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/spreadsheet'
    },

    input: SpreadsheetId,
    output: Spreadsheet,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],

    exec: async (nango, input): Promise<Spreadsheet> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
