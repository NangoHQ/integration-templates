import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    description: z.string().optional().describe('Repository description.'),
    is_private: z.boolean().optional().describe('Whether the repository is private.'),
    language: z.string().optional().describe('Primary language. Example: "javascript"'),
    website: z.string().optional().describe('Website URL associated with the repository.'),
    fork_policy: z.enum(['allow_forks', 'no_public_forks', 'no_forks']).optional().describe('Fork policy for the repository.'),
    mainbranch: z.string().optional().describe('Name of the main branch. Example: "main"')
});

const ProviderRepositorySchema = z.object({
    uuid: z.string(),
    name: z.string(),
    slug: z.string(),
    full_name: z.string().optional(),
    description: z.string().optional().nullable(),
    is_private: z.boolean().optional(),
    language: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    fork_policy: z.string().optional(),
    mainbranch: z
        .object({
            name: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    workspace: z
        .object({
            slug: z.string()
        })
        .optional()
        .nullable(),
    project: z
        .object({
            key: z.string(),
            name: z.string().optional(),
            uuid: z.string().optional()
        })
        .optional()
        .nullable(),
    created_on: z.string().optional().nullable(),
    updated_on: z.string().optional().nullable()
});

const OutputSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    slug: z.string(),
    full_name: z.string().optional(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    language: z.string().optional(),
    website: z.string().optional(),
    fork_policy: z.string().optional(),
    mainbranch: z.string().optional(),
    workspace_slug: z.string().optional(),
    project_key: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional()
});

const action = createAction({
    description: 'Update repository metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository:write'],
    endpoint: {
        path: '/actions/update-repository',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {
            ...(input.description !== undefined && { description: input.description }),
            ...(input.is_private !== undefined && { is_private: input.is_private }),
            ...(input.language !== undefined && { language: input.language }),
            ...(input.website !== undefined && { website: input.website }),
            ...(input.fork_policy !== undefined && { fork_policy: input.fork_policy }),
            ...(input.mainbranch !== undefined && { mainbranch: { name: input.mainbranch, type: 'branch' } })
        };

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-put
        const response = await nango.put({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}`,
            data: updateBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Bitbucket API.'
            });
        }

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        const workspaceSlug = providerRepo.workspace ? providerRepo.workspace.slug : undefined;
        const projectKey = providerRepo.project ? providerRepo.project.key : undefined;
        const mainbranchName = providerRepo.mainbranch ? providerRepo.mainbranch.name : undefined;

        return {
            uuid: providerRepo.uuid,
            name: providerRepo.name,
            slug: providerRepo.slug,
            ...(providerRepo.full_name !== undefined && { full_name: providerRepo.full_name }),
            ...(providerRepo.description !== undefined && providerRepo.description !== null && { description: providerRepo.description }),
            ...(providerRepo.is_private !== undefined && { is_private: providerRepo.is_private }),
            ...(providerRepo.language !== undefined && providerRepo.language !== null && { language: providerRepo.language }),
            ...(providerRepo.website !== undefined && providerRepo.website !== null && { website: providerRepo.website }),
            ...(providerRepo.fork_policy !== undefined && { fork_policy: providerRepo.fork_policy }),
            ...(mainbranchName !== undefined && { mainbranch: mainbranchName }),
            ...(workspaceSlug !== undefined && { workspace_slug: workspaceSlug }),
            ...(projectKey !== undefined && { project_key: projectKey }),
            ...(providerRepo.created_on !== undefined && providerRepo.created_on !== null && { created_on: providerRepo.created_on }),
            ...(providerRepo.updated_on !== undefined && providerRepo.updated_on !== null && { updated_on: providerRepo.updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
