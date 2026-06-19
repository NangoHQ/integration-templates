import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 309484')
});

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        uuid: z.string(),
        organization: z.string(),
        name: z.string(),
        product_description: z.string().optional().nullable(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const OutputSchema = ProviderProjectSchema;

const action = createAction({
    description: 'Retrieve a single project from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://posthog.com/docs/api/projects
            endpoint: `/api/projects/${encodeURIComponent(String(input.project_id))}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                project_id: input.project_id
            });
        }

        const providerProject = ProviderProjectSchema.parse(response.data);
        return providerProject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
