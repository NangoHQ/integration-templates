import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    pull_request_id: z.number().describe('Pull request ID. Example: 108'),
    merge_strategy: z.enum(['merge_commit', 'squash', 'fast_forward']).optional().describe('Merge strategy. Example: "merge_commit"'),
    message: z.string().optional().describe('Merge commit message. Example: "Merging feature branch"'),
    close_source_branch: z.boolean().optional().describe('Whether to close the source branch after merging. Example: true')
});

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    title: z.string(),
    state: z.string(),
    merge_commit: z
        .object({
            hash: z.string().optional()
        })
        .optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    closed_by: z
        .object({
            type: z.string().optional()
        })
        .optional(),
    reason: z.string().optional(),
    close_source_branch: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    title: z.string(),
    state: z.string(),
    merge_commit_hash: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    closed_by_type: z.string().optional(),
    reason: z.string().optional(),
    close_source_branch: z.boolean().optional()
});

const action = createAction({
    description: 'Merge a pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-merge-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/${input.pull_request_id}/merge`,
            data: {
                type: 'pullrequest',
                ...(input.merge_strategy !== undefined && { merge_strategy: input.merge_strategy }),
                ...(input.message !== undefined && { message: input.message }),
                ...(input.close_source_branch !== undefined && { close_source_branch: input.close_source_branch })
            },
            retries: 3
        });

        if (response.status === 202) {
            throw new nango.ActionError({
                type: 'merge_pending',
                message: 'Merge is being processed asynchronously. Check the task status endpoint for completion.',
                pull_request_id: input.pull_request_id
            });
        }

        const providerPullRequest = ProviderPullRequestSchema.parse(response.data);

        return {
            id: providerPullRequest.id,
            title: providerPullRequest.title,
            state: providerPullRequest.state,
            ...(providerPullRequest.merge_commit?.hash !== undefined && { merge_commit_hash: providerPullRequest.merge_commit.hash }),
            ...(providerPullRequest.created_on !== undefined && { created_on: providerPullRequest.created_on }),
            ...(providerPullRequest.updated_on !== undefined && { updated_on: providerPullRequest.updated_on }),
            ...(providerPullRequest.closed_by?.type !== undefined && { closed_by_type: providerPullRequest.closed_by.type }),
            ...(providerPullRequest.reason !== undefined && { reason: providerPullRequest.reason }),
            ...(providerPullRequest.close_source_branch !== undefined && { close_source_branch: providerPullRequest.close_source_branch })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
