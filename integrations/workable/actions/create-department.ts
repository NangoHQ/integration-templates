import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the new department. Example: "Engineering"'),
    parent_id: z.string().optional().describe('The department identifier of the parent department. Example: "3ff4d641"')
});

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable().optional(),
    sample: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().optional(),
    sample: z.boolean().optional()
});

const action = createAction({
    description: 'Create a new department',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_departments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/departments-post.md
            endpoint: '/spi/v3/departments',
            data: {
                name: input.name,
                ...(input.parent_id !== undefined && { parent_id: input.parent_id })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Department creation failed: empty response from provider'
            });
        }

        const providerDepartment = ProviderDepartmentSchema.parse(response.data);

        return {
            id: providerDepartment.id,
            name: providerDepartment.name,
            ...(providerDepartment.parent_id != null && { parent_id: providerDepartment.parent_id }),
            ...(providerDepartment.sample != null && { sample: providerDepartment.sample })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
