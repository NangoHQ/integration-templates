import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('The workspace GID to fetch projects from. Example: "1234567890"'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of projects to return. Defaults to 10.')
});

const ProjectSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema)
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown())
});

const action = createAction({
    description: 'Fetch projects with a limit (default 10) for a given workspace, for use when selecting tasks to sync.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/fetch-projects',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/getprojects
        const response = await nango.get({
            endpoint: '/api/1.0/projects',
            params: {
                workspace: input.workspace,
                limit: input.limit ?? 10,
                opt_fields: 'gid,name,resource_type'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Asana API: could not parse projects data.'
            });
        }

        const items = parsed.data.data.map((item) => ProjectSchema.parse(item));

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
