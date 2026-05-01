import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_gid: z.string().min(1).describe('The globally unique identifier of the project. Example: "1211440849237745"'),
    opt_fields: z.string().optional().describe('Comma-separated list of optional fields to include in the response.')
});

const ProviderProjectSchema = z
    .object({
        gid: z.string(),
        name: z.string().optional(),
        resource_type: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderProjectSchema;

const action = createAction({
    description: 'Fetch a single project by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/getproject
        const response = await nango.get({
            endpoint: `/api/1.0/projects/${encodeURIComponent(input.project_gid)}`,
            params: {
                ...(input.opt_fields !== undefined && { opt_fields: input.opt_fields })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: ProviderProjectSchema
            })
            .parse(response.data);

        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
