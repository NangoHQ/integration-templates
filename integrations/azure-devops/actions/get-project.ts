import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "ecbf2301-2e63-41b4-a8fd-1d2d4e1f8b9c" or "Fabrikam"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    state: z.string().optional(),
    revision: z.number().optional(),
    visibility: z.string().optional(),
    lastUpdateTime: z.string().optional(),
    description: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    state: z.string().optional(),
    revision: z.number().optional(),
    visibility: z.string().optional(),
    lastUpdateTime: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single Azure DevOps project by ID or name.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.project'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/get?view=azure-devops-rest-7.2
            endpoint: `/_apis/projects/${encodeURIComponent(input.projectId)}`,
            params: {
                'api-version': '7.2-preview.4'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                projectId: input.projectId
            });
        }

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            name: providerProject.name,
            ...(providerProject.url !== undefined && { url: providerProject.url }),
            ...(providerProject.state !== undefined && { state: providerProject.state }),
            ...(providerProject.revision !== undefined && { revision: providerProject.revision }),
            ...(providerProject.visibility !== undefined && { visibility: providerProject.visibility }),
            ...(providerProject.lastUpdateTime !== undefined && { lastUpdateTime: providerProject.lastUpdateTime }),
            ...(providerProject.description != null && { description: providerProject.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
