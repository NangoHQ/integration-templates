import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Project name. Example: "Nango Registry Test Project"'),
    key: z.string().describe('Short project key. Example: "NRT"')
});

const ProviderProjectResponseSchema = z
    .object({
        data: z
            .object({
                id: z.string(),
                type: z.string(),
                attributes: z
                    .object({
                        name: z.string().optional(),
                        key: z.string().optional()
                    })
                    .passthrough()
            })
            .passthrough()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    key: z.string().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Create a new case-management project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/case-management/#create-a-project
            endpoint: 'v2/cases/projects',
            data: {
                data: {
                    type: 'project',
                    attributes: {
                        name: input.name,
                        key: input.key
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderProjectResponseSchema.parse(response.data);
        const project = providerResponse.data;

        return {
            id: project.id,
            ...(project.attributes.name != null && { name: project.attributes.name }),
            ...(project.attributes.key != null && { key: project.attributes.key }),
            ...(project.type != null && { type: project.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
