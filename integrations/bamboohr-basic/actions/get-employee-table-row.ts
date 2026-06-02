import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID. Example: "123"'),
    table: z.string().describe('The API name of the table. Example: "jobInfo", "compensation", "employmentStatus"'),
    rowId: z.string().describe('The ID of the specific row to retrieve.')
});

const OutputSchema = z.object({}).passthrough();

function parseTableRowFromXml(xml: string, targetRowId: string): Record<string, string> | null {
    const rowRegex = new RegExp(`<row id="${targetRowId}"[^>]*>([\\s\\S]*?)</row>`);
    const rowMatch = xml.match(rowRegex);
    if (!rowMatch || rowMatch[1] === undefined) {
        return null;
    }

    const rowXml = rowMatch[1];
    const fields: Record<string, string> = {};
    const fieldRegex = /<field id="([^"]+)">([^<]*)<\/field>/g;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(rowXml)) !== null) {
        const fieldId = fieldMatch[1];
        const fieldValue = fieldMatch[2];
        if (fieldId !== undefined && fieldValue !== undefined) {
            fields[fieldId] = fieldValue;
        }
    }

    return fields;
}

const action = createAction({
    description: 'Retrieve a single employee table row from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-employee-table-row',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-employee-table-data
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/tables/${encodeURIComponent(input.table)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'string') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee table data not found',
                employeeId: input.employeeId,
                table: input.table,
                rowId: input.rowId
            });
        }

        const row = parseTableRowFromXml(response.data, input.rowId);

        if (!row) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee table row not found',
                employeeId: input.employeeId,
                table: input.table,
                rowId: input.rowId
            });
        }

        return row;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
