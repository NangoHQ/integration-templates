import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID. Example: "nangodev"'),
    repositoryId: z.string().describe('Repository ID. Example: "46eadaf5-eb36-43bc-8297-a9b4043afd09"'),
    pullRequestId: z.number().describe('Pull request ID. Example: 2'),
    title: z.string().optional().describe('Updated title for the pull request.'),
    description: z.string().nullable().optional().describe('Updated description for the pull request. Pass null to clear.'),
    status: z.enum(['active', 'abandoned', 'completed']).optional().describe('Updated status for the pull request.'),
    isDraft: z.boolean().optional().describe('Whether the pull request is a draft.'),
    lastMergeSourceCommitId: z.string().optional().describe('The last merge source commit ID. Required when completing a PR (status: completed).')
});

const ProviderPullRequestSchema = z.object({
    pullRequestId: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    isDraft: z.boolean(),
    url: z.string(),
    lastMergeSourceCommit: z
        .object({
            commitId: z.string()
        })
        .optional()
        .nullable(),
    lastMergeTargetCommit: z
        .object({
            commitId: z.string()
        })
        .optional()
        .nullable(),
    lastMergeCommit: z
        .object({
            commitId: z.string()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    pullRequestId: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    isDraft: z.boolean(),
    url: z.string(),
    lastMergeSourceCommit: z
        .object({
            commitId: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Update a pull request (title, description, status, reviewers, etc.).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-pull-request',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code_write', 'vso.code'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.status === 'completed' && !input.lastMergeSourceCommitId) {
            throw new nango.ActionError({
                type: 'missing_last_merge_source_commit',
                message: 'lastMergeSourceCommitId is required when completing a pull request.'
            });
        }

        const body: {
            title?: string;
            description?: string | null;
            status?: string;
            isDraft?: boolean;
            lastMergeSourceCommit?: { commitId: string };
        } = {};

        if (input.title !== undefined) {
            body.title = input.title;
        }

        if (input.description !== undefined) {
            body.description = input.description;
        }

        if (input.status !== undefined) {
            body.status = input.status;
        }

        if (input.isDraft !== undefined) {
            body.isDraft = input.isDraft;
        }

        if (input.lastMergeSourceCommitId !== undefined) {
            body.lastMergeSourceCommit = {
                commitId: input.lastMergeSourceCommitId
            };
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/update?view=azure-devops-rest-7.2
        const response = await nango.patch({
            endpoint: `/${encodeURIComponent(input.projectId)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pullrequests/${encodeURIComponent(String(input.pullRequestId))}`,
            params: {
                'api-version': '7.2-preview.1'
            },
            data: body,
            retries: 3
        });

        const providerPullRequest = ProviderPullRequestSchema.parse(response.data);

        return {
            pullRequestId: providerPullRequest.pullRequestId,
            status: providerPullRequest.status,
            title: providerPullRequest.title,
            ...(providerPullRequest.description != null && { description: providerPullRequest.description }),
            sourceRefName: providerPullRequest.sourceRefName,
            targetRefName: providerPullRequest.targetRefName,
            isDraft: providerPullRequest.isDraft,
            url: providerPullRequest.url,
            ...(providerPullRequest.lastMergeSourceCommit != null && {
                lastMergeSourceCommit: {
                    commitId: providerPullRequest.lastMergeSourceCommit.commitId
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
