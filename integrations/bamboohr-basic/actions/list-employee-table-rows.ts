import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID. Use the special value "all" to retrieve table data for all employees the API user has access to.'),
    table: z
        .string()
        .describe(
            'The API name of the table to retrieve. Examples: jobInfo, compensation, employmentStatus, contacts, emergencyContacts, dependents, employeeEducation.'
        )
});

const TableRowSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    rows: z.array(TableRowSchema)
});

const action = createAction({
    description: 'List employee table rows from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-employee-table-rows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employee'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-employee-table-data
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/tables/${encodeURIComponent(input.table)}`,
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of table rows from the BambooHR API.'
            });
        }

        const rows = response.data.map((row: unknown) => {
            const parsed = TableRowSchema.safeParse(row);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_row',
                    message: 'Row missing required id field.'
                });
            }
            return parsed.data;
        });

        return { rows };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
