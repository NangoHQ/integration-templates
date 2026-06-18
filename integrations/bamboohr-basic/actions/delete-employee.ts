import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The BambooHR employee ID to delete. Example: "123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    employeeId: z.string()
});

const action = createAction({
    description: 'Delete or archive an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/delete-employee
        await nango.delete({
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}`,
            retries: 3
        });

        return {
            success: true,
            employeeId: input.employeeId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
