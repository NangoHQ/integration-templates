import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 4145631'),
    name: z.string().optional().describe('New project name.'),
    status: z.enum(['active', 'archived']).optional().describe('Project status. Set to "archived" to archive the project.')
});

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        organization_id: z.number().optional().nullable()
    })
    .passthrough();

const OutputSchema = ProviderProjectSchema;

const action = createAction({
    description: "Update a project's name, or archive it by setting status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.status === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of "name" or "status" must be provided.'
            });
        }

        const response = await nango.put({
            // https://developer.hubstaff.com/
            endpoint: `v2/projects/${encodeURIComponent(input.project_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });

        const raw = z.object({ project: ProviderProjectSchema }).parse(response.data);
        return raw.project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
