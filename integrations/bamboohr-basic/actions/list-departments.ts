import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderOptionSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    archived: z.string().optional()
});

const ProviderListSchema = z.object({
    id: z.number().optional(),
    fieldId: z.number().optional(),
    alias: z.string().optional(),
    name: z.string().optional(),
    manageable: z.string().optional(),
    multiple: z.string().optional(),
    options: z.array(ProviderOptionSchema).optional()
});

const ProviderListsResponseSchema = z.array(ProviderListSchema);

const OutputSchema = z.object({
    departments: z.array(
        z.object({
            id: z.union([z.string(), z.number()]),
            name: z.string(),
            archived: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List departments configured in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/list-list-fields
        const response = await nango.get({
            endpoint: '/v1/meta/lists',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerLists = ProviderListsResponseSchema.parse(response.data);
        const departmentList = providerLists.find(
            (list) => list.alias === 'department' || list.alias === 'jobDepartment' || list.name?.toLowerCase() === 'department'
        );

        if (!departmentList || !departmentList.options) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Department list not found in account metadata.'
            });
        }

        return {
            departments: departmentList.options.map((option) => ({
                id: option.id,
                name: option.name,
                ...(option.archived !== undefined && { archived: option.archived })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
