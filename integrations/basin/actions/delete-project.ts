import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().int().positive().describe('Project ID. Example: 59615')
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
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/projects/${encodeURIComponent(input.project_id)}`,
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                project_id: input.project_id
            });
        }

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
