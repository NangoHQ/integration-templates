import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        department_id: z.string().describe('The unique identifier of the department to rename. Example: "c16b6ee1-2f5d-45e9-9fb4-c1c541a9ea70"'),
        name: z.string().describe('The new name to assign to the department. Example: "HR"')
    })
    .describe('Input for renaming an existing department.');

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the updated department.'),
        name: z.string().describe('The new name of the department as stored by Ramp.')
    })
    .describe('The department after the rename was applied.');

/**
 * @tags: [write]
 * @tagReason: Renames an existing department through a provider mutation.
 * @pitfalls: Department names are not required to be unique, so renaming to a name already in use creates a duplicate rather than being rejected.
 */
const action = createAction({
    description: 'Rename a department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['departments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.ramp.com/developer-api/v1/api-reference/departments/update-a-department
            endpoint: `/developer/v1/departments/${encodeURIComponent(input.department_id)}`,
            data: {
                name: input.name
            },
            // PATCH to the same name is idempotent, so a retry after a lost response is safe.
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Department not found',
                department_id: input.department_id
            });
        }

        const department = ProviderDepartmentSchema.parse(response.data);

        return {
            id: department.id,
            name: department.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
