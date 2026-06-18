import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The BambooHR employee ID. Example: "123"'),
    table: z.string().describe('The API name of the table containing the row to delete. Example: "jobInfo", "compensation", or "customTabularField"'),
    rowId: z.string().describe('The ID of the specific row to delete. Example: "456"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an employee table row in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://documentation.bamboohr.com/reference/delete-employee-table-row
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/tables/${encodeURIComponent(input.table)}/${encodeURIComponent(input.rowId)}`,
            retries: 1
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_provider_response',
                message: 'Provider returned an unexpected response format.',
                data: response.data
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: parsed.data.error || 'Row could not be deleted.',
                employee_id: input.employeeId,
                table: input.table,
                row_id: input.rowId
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
