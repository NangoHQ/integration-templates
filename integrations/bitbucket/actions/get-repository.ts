import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug or UUID. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"')
});

const ProviderRepositorySchema = z.object({
    type: z.string().optional(),
    uuid: z.string(),
    full_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    size: z.number().optional(),
    language: z.string().optional(),
    is_private: z.boolean().optional(),
    has_issues: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    fork_policy: z.string().optional(),
    scm: z.string().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    project: z.record(z.string(), z.unknown()).optional(),
    mainbranch: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    uuid: z.string(),
    full_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    size: z.number().optional(),
    language: z.string().optional(),
    is_private: z.boolean().optional(),
    has_issues: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    fork_policy: z.string().optional(),
    scm: z.string().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    project: z.record(z.string(), z.unknown()).optional(),
    mainbranch: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a repository.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-repository' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedWorkspace = encodeURIComponent(input.workspace);
        const encodedRepoSlug = encodeURIComponent(input.repo_slug);

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-get
            endpoint: `/2.0/repositories/${encodedWorkspace}/${encodedRepoSlug}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Repository not found',
                workspace: input.workspace,
                repo_slug: input.repo_slug
            });
        }

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        return {
            uuid: providerRepo.uuid,
            ...(providerRepo.full_name !== undefined && { full_name: providerRepo.full_name }),
            ...(providerRepo.name !== undefined && { name: providerRepo.name }),
            ...(providerRepo.description !== undefined && { description: providerRepo.description }),
            ...(providerRepo.created_on !== undefined && { created_on: providerRepo.created_on }),
            ...(providerRepo.updated_on !== undefined && { updated_on: providerRepo.updated_on }),
            ...(providerRepo.size !== undefined && { size: providerRepo.size }),
            ...(providerRepo.language !== undefined && { language: providerRepo.language }),
            ...(providerRepo.is_private !== undefined && { is_private: providerRepo.is_private }),
            ...(providerRepo.has_issues !== undefined && { has_issues: providerRepo.has_issues }),
            ...(providerRepo.has_wiki !== undefined && { has_wiki: providerRepo.has_wiki }),
            ...(providerRepo.fork_policy !== undefined && { fork_policy: providerRepo.fork_policy }),
            ...(providerRepo.scm !== undefined && { scm: providerRepo.scm }),
            ...(providerRepo['owner'] !== undefined && { owner: providerRepo['owner'] }),
            ...(providerRepo['project'] !== undefined && { project: providerRepo['project'] }),
            ...(providerRepo['mainbranch'] !== undefined && { mainbranch: providerRepo['mainbranch'] }),
            ...(providerRepo['links'] !== undefined && { links: providerRepo['links'] }),
            ...(providerRepo.type !== undefined && { type: providerRepo.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
