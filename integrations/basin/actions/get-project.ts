import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 59611')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Get a single project by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.usebasin.com/developer-features/api-reference/
        const response = await nango.get({
            endpoint: `/v1/projects/${encodeURIComponent(input.project_id)}`,
            retries: 3
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            created_at: providerProject.created_at,
            updated_at: providerProject.updated_at,
            name: providerProject.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
