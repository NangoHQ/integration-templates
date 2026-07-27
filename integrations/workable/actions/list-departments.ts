import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    departments: z.array(DepartmentSchema)
});

const action = createAction({
    description: "List the account's departments.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_account'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/departments
            endpoint: '/spi/v3/departments',
            retries: 3
        });

        const departments = z.array(DepartmentSchema).parse(response.data);

        return {
            departments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
