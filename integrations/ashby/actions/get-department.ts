import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    departmentId: z.string().uuid().describe('The unique id of the department whose details will be fetched. Example: "148bea15-9b05-4aae-97a0-7886df2d549f"')
});

const ProviderDepartmentSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    externalName: z.string().nullable(),
    isArchived: z.boolean(),
    parentId: z.string().uuid().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    extraData: z.record(z.string(), z.unknown()).nullable()
});

const OutputSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    externalName: z.string().optional(),
    isArchived: z.boolean(),
    parentId: z.string().uuid().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    extraData: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single department from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-department',
        group: 'Departments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizationRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/departmentinfo
            endpoint: 'department.info',
            data: {
                departmentId: input.departmentId
            },
            retries: 3
        });

        if (!response.data || response.data.success === false) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Department not found',
                departmentId: input.departmentId
            });
        }

        const providerDepartment = ProviderDepartmentSchema.parse(response.data.results);

        return {
            id: providerDepartment.id,
            name: providerDepartment.name,
            isArchived: providerDepartment.isArchived,
            createdAt: providerDepartment.createdAt,
            updatedAt: providerDepartment.updatedAt,
            ...(providerDepartment.externalName != null && { externalName: providerDepartment.externalName }),
            ...(providerDepartment.parentId != null && { parentId: providerDepartment.parentId }),
            ...(providerDepartment.extraData != null && { extraData: providerDepartment.extraData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
