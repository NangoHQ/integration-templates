import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { JSONSpreadsheet, IdEntity } from "../models.js";

const action = createAction({
    description: "Fetches the content of a native google spreadsheet given its ID. Outputs\na JSON representation of a google sheet.",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/fetch-google-sheet",
        group: "Documents"
    },

    input: IdEntity,
    output: JSONSpreadsheet,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],

    exec: async (nango, input): Promise<JSONSpreadsheet> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
