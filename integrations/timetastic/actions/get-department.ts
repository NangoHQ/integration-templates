import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the department. Example: 248819')
});

const ProviderDepartmentSchema = z.object({
    id: z.number(),
    organisationId: z.number().optional(),
    name: z.string().nullable().optional(),
    managerId: z.number().optional(),
    bossId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archived: z.boolean().optional(),
    userCount: z.number().optional(),
    maxOff: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    organisationId: z.number().optional(),
    name: z.string().optional(),
    managerId: z.number().optional(),
    bossId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archived: z.boolean().optional(),
    userCount: z.number().optional(),
    maxOff: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: `/departments/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Department with id ${input.id} not found.`
            });
        }

        const department = ProviderDepartmentSchema.parse(response.data);

        return {
            id: department.id,
            ...(department.organisationId !== undefined && { organisationId: department.organisationId }),
            ...(department.name != null && { name: department.name }),
            ...(department.managerId !== undefined && { managerId: department.managerId }),
            ...(department.bossId !== undefined && { bossId: department.bossId }),
            ...(department.createdAt !== undefined && { createdAt: department.createdAt }),
            ...(department.updatedAt !== undefined && { updatedAt: department.updatedAt }),
            ...(department.archived !== undefined && { archived: department.archived }),
            ...(department.userCount !== undefined && { userCount: department.userCount }),
            ...(department.maxOff !== undefined && { maxOff: department.maxOff })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
