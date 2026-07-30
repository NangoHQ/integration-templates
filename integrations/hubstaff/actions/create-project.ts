import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    name: z.string().describe('Project name.')
});

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new project in an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.hubstaff.com/
        const response = await nango.post({
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/projects`,
            data: {
                name: input.name
            },
            retries: 1
        });

        const raw = z.object({ project: z.unknown() }).parse(response.data);
        const project = ProviderProjectSchema.parse(raw.project);

        return {
            id: project.id,
            name: project.name,
            ...(project.status !== undefined && { status: project.status }),
            ...(project.created_at !== undefined && { created_at: project.created_at }),
            ...(project.updated_at !== undefined && { updated_at: project.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
