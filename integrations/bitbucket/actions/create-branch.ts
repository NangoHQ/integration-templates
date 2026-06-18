import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    name: z.string().describe('Branch name. Example: "feature-branch"'),
    target_hash: z.string().describe('Commit hash or existing branch name to branch from. Example: "master"')
});

const ProviderCommitSchema = z.object({
    hash: z.string(),
    type: z.string().optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const ProviderBranchSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    links: z.record(z.string(), z.unknown()).optional(),
    target: ProviderCommitSchema.optional()
});

const OutputSchema = z.object({
    name: z.string(),
    target_hash: z.string().optional()
});

const action = createAction({
    description: 'Create a branch in a repository',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-branch' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-branching-model/#api-repositories-workspace-repo-slug-refs-branches-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/refs/branches`,
            data: {
                name: input.name,
                target: {
                    hash: input.target_hash
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Bitbucket API'
            });
        }

        const providerBranch = ProviderBranchSchema.parse(response.data);

        return {
            name: providerBranch.name,
            ...(providerBranch.target?.hash !== undefined && { target_hash: providerBranch.target.hash })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
