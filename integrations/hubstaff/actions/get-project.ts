import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.number().describe('Project ID. Example: 4145631')
});

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        status: z.string().optional(),
        type: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        billable: z.boolean().optional(),
        metadata: z.object({}).passthrough().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    project: ProviderProjectSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    billable: z.boolean().optional(),
    metadata: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Get a single project by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/projects/${encodeURIComponent(input.projectId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project ${input.projectId} not found.`
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const project = providerResponse.project;

        return {
            id: project.id,
            name: project.name,
            ...(project.status !== undefined && { status: project.status }),
            ...(project.type !== undefined && { type: project.type }),
            ...(project.created_at !== undefined && { created_at: project.created_at }),
            ...(project.updated_at !== undefined && { updated_at: project.updated_at }),
            ...(project.billable !== undefined && { billable: project.billable }),
            ...(project.metadata !== undefined && { metadata: project.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
