import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the department.'),
    managerId: z.number().describe('User ID of the department manager.'),
    maxOff: z.number().optional().describe('Maximum simultaneous absences allowed. 0 means unlimited.')
});

const ProviderResponseSchema = z.object({
    id: z.number()
});

const OutputSchema = z.object({
    id: z.number()
});

const action = createAction({
    description: 'Create a new department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://timetastic.co.uk/api/
            endpoint: '/departments/add',
            data: {
                name: input.name,
                managerId: input.managerId,
                ...(input.maxOff !== undefined && { maxOff: input.maxOff })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
