import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.number().describe('Project ID. Example: 59612'),
    name: z.string().describe('New project name. Example: "Updated Project Name"')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: "Update a project's name.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://usebasin.com/api_docs/v1/swagger.yaml
            endpoint: `/v1/projects/${encodeURIComponent(input.projectId)}`,
            data: {
                name: input.name
            },
            retries: 1
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
