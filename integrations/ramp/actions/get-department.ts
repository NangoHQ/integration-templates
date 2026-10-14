import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        department_id: z.string().describe('Unique identifier of the department to retrieve. Example: "72139263-f303-4aea-93de-35a5111c0c03"')
    })
    .describe('Identifies the department to retrieve.');

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier for the department.'),
        name: z.string().describe('Name of the department.')
    })
    .describe('A single Ramp department.');

/**
 * @tags: [read]
 * @tagReason: Reads a single existing department from the provider without modifying any provider data.
 * @pitfalls: This read is served from a read replica, so a department created or renamed moments earlier can briefly return stale data.
 */
const action = createAction({
    description: 'Retrieve a single department by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['departments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/departments/get-department
            endpoint: `/developer/v1/departments/${encodeURIComponent(input.department_id)}`,
            retries: 3
        });

        const department = ProviderDepartmentSchema.parse(response.data);

        return {
            id: department.id,
            name: department.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
