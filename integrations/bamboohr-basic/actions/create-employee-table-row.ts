import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "123"'),
    table: z.string().describe('The API name of the table to add a row to. Example: "jobInfo"'),
    fields: z.record(z.string(), z.unknown()).describe('Dictionary of table field names and values for the new row.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    employee_id: z.string(),
    table: z.string()
});

const action = createAction({
    description: 'Create an employee table row in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-employee-table-row',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/v1/employees/${encodeURIComponent(input.employee_id)}/tables/${encodeURIComponent(input.table)}`;

        // https://documentation.bamboohr.com/reference/create-table-row
        await nango.post({
            endpoint,
            data: input.fields,
            retries: 3
        });

        return {
            success: true,
            employee_id: input.employee_id,
            table: input.table
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
