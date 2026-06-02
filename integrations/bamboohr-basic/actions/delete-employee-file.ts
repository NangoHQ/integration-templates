import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z
        .union([z.string(), z.number()])
        .describe('The ID of the employee whose file is being deleted. Use 0 to default to the employee associated with the API key.'),
    fileId: z.union([z.string(), z.number()]).describe('The ID of the employee file to delete.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    employeeId: z.union([z.string(), z.number()]),
    fileId: z.union([z.string(), z.number()])
});

const action = createAction({
    description: 'Delete a file from an employee record in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-employee-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const employeeId = String(input.employeeId);
        const fileId = String(input.fileId);

        await nango.delete({
            // https://documentation.bamboohr.com/reference/delete-employee-file
            endpoint: `v1/employees/${encodeURIComponent(employeeId)}/files/${encodeURIComponent(fileId)}`,
            retries: 3
        });

        return {
            success: true,
            employeeId: input.employeeId,
            fileId: input.fileId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
