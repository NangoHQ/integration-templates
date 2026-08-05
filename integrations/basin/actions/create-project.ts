import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Project name. Example: "My Project"')
});

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a new project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: 'v1/projects/',
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            name: providerProject.name,
            ...(providerProject.created_at !== undefined && { created_at: providerProject.created_at }),
            ...(providerProject.updated_at !== undefined && { updated_at: providerProject.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
