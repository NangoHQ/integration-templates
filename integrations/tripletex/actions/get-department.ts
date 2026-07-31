import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Department ID. Example: 553503')
});

const ProviderDepartmentSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string(),
    departmentNumber: z.string().optional().nullable(),
    departmentManager: z
        .object({
            id: z.number(),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    displayName: z.string().optional(),
    isInactive: z.boolean().optional(),
    businessActivityTypeId: z.number().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderDepartmentSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    departmentNumber: z.string().optional(),
    departmentManager: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    displayName: z.string().optional(),
    isInactive: z.boolean().optional(),
    businessActivityTypeId: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['department.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: `v2/department/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const department = providerResponse.value;

        return {
            id: department.id,
            name: department.name,
            ...(department.departmentNumber != null && {
                departmentNumber: department.departmentNumber
            }),
            ...(department.departmentManager != null && {
                departmentManager: {
                    id: department.departmentManager.id,
                    ...(department.departmentManager.name != null && {
                        name: department.departmentManager.name
                    })
                }
            }),
            ...(department.displayName !== undefined && {
                displayName: department.displayName
            }),
            ...(department.isInactive !== undefined && {
                isInactive: department.isInactive
            }),
            ...(department.businessActivityTypeId !== undefined && {
                businessActivityTypeId: department.businessActivityTypeId
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
