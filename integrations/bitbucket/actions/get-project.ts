import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('The workspace slug. Example: "nangodev"'),
    project_key: z.string().describe('The project short uppercase key. Example: "PROJ"')
});

const ProviderProjectSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Retrieve a project in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    endpoint: {
        method: 'GET',
        path: '/actions/get-project'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let responseData: unknown;
        // @allowTryCatch Catch 404 to surface a friendlier not_found error.
        try {
            const response = await nango.get({
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-projects-project-key-get
                endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}/projects/${encodeURIComponent(input.project_key)}`,
                retries: 3
            });
            responseData = response.data;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('404')) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Project not found',
                    workspace: input.workspace,
                    project_key: input.project_key
                });
            }
            throw err;
        }

        const project = ProviderProjectSchema.parse(responseData);

        return {
            ...(project.type !== undefined && { type: project.type }),
            ...(project.uuid !== undefined && { uuid: project.uuid }),
            ...(project.key !== undefined && { key: project.key }),
            ...(project.name !== undefined && { name: project.name }),
            ...(project.description !== undefined && project.description !== null && { description: project.description }),
            ...(project.is_private !== undefined && { is_private: project.is_private }),
            ...(project.created_on !== undefined && { created_on: project.created_on }),
            ...(project.updated_on !== undefined && { updated_on: project.updated_on }),
            ...(project.links !== undefined && { links: project.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
