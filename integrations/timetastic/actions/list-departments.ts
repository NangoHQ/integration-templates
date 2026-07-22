import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const DepartmentSchema = z.object({
    id: z.number().describe('The unique Id for this department. Example: 248819'),
    organisationId: z.number().describe('The organisation Id of this department. Example: 100741'),
    name: z.string().nullable().optional().describe("The department's name"),
    managerId: z.number().optional().describe('The department manager user id'),
    bossId: z.number().optional().describe('The department boss user id (deprecated)'),
    createdAt: z.string().optional().describe('When the department was created'),
    updatedAt: z.string().optional().describe('When the department was last updated'),
    archived: z.boolean().optional().describe('Whether the department is archived (deleted)'),
    userCount: z.number().optional().describe('Number of users in the department'),
    maxOff: z.number().optional().describe('The maximum number of staff allowed off at any one time. 0 means unlimited')
});

const OutputSchema = z.object({
    departments: z.array(DepartmentSchema)
});

const action = createAction({
    description: 'List all departments for the organisation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://timetastic.co.uk/api/
            endpoint: '/departments',
            retries: 3
        };

        const response = await nango.get(config);

        const departments = z.array(DepartmentSchema).parse(response.data);

        return {
            departments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
