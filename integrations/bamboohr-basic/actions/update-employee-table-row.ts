import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID. Example: "123"'),
    table: z.string().describe('The API name of the table containing the row to update. Example: "employmentStatus"'),
    rowId: z.string().describe('The ID of the row to update. Example: "456"'),
    fields: z.record(z.string(), z.unknown()).describe('Dictionary of table field names and values to update.')
});

const OutputSchema = z.object({
    employeeId: z.string(),
    table: z.string(),
    rowId: z.string(),
    updated: z.boolean()
});

const action = createAction({
    description: 'Update an employee table row in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/update-table-row
        await nango.post({
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/tables/${encodeURIComponent(input.table)}/${encodeURIComponent(input.rowId)}`,
            data: input.fields,
            retries: 3
        });

        return {
            employeeId: input.employeeId,
            table: input.table,
            rowId: input.rowId,
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
