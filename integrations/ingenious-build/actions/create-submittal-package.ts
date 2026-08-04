import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    name: z.string().describe('Name of the submittal package.'),
    number: z.string().describe('Package number as a plain numeric string. Example: "1"')
});

const ProviderResponseSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a new submittal package for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/createsubmittalpackagepubv2.md
            endpoint: '/api/v2/pub/submittal-packages',
            data: {
                project_id: input.project_id,
                name: input.name,
                number: input.number
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
