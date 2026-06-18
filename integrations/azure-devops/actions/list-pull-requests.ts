import { z } from 'zod';
import { createAction } from 'nango';

const IdentityRefSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional(),
    uniqueName: z.string().optional(),
    url: z.string().optional()
});

const GitCommitRefSchema = z.object({
    commitId: z.string().optional(),
    url: z.string().optional()
});

const GitRepositorySchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    project: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const IdentityRefWithVoteSchema = IdentityRefSchema.extend({
    vote: z.number().optional(),
    isRequired: z.boolean().optional(),
    reviewerUrl: z.string().optional()
});

const GitPullRequestSchema = z.object({
    pullRequestId: z.number().optional(),
    codeReviewId: z.number().optional(),
    status: z.string().optional(),
    createdBy: IdentityRefSchema.optional(),
    creationDate: z.string().optional(),
    closedDate: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    sourceRefName: z.string().optional(),
    targetRefName: z.string().optional(),
    mergeStatus: z.string().optional(),
    mergeId: z.string().optional(),
    lastMergeSourceCommit: GitCommitRefSchema.optional(),
    lastMergeTargetCommit: GitCommitRefSchema.optional(),
    lastMergeCommit: GitCommitRefSchema.optional(),
    reviewers: z.array(IdentityRefWithVoteSchema).optional(),
    url: z.string().optional(),
    repository: GitRepositorySchema.optional(),
    supportsIterations: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    completionQueueTime: z.string().optional(),
    closedBy: IdentityRefSchema.optional()
});

const PullRequestListResponseSchema = z.object({
    value: z.array(z.unknown()).optional(),
    count: z.number().optional()
});

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "MyProject"'),
    repositoryId: z.string().describe('The repository ID or name. Example: "3411ebc1-d5aa-464f-9615-0b527bc66719"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    status: z.enum(['active', 'abandoned', 'completed', 'all']).optional().describe('Filter by pull request status. Defaults to Active if unset.'),
    sourceRefName: z.string().optional().describe('If set, search for pull requests from this branch. Example: "refs/heads/feature"'),
    targetRefName: z.string().optional().describe('If set, search for pull requests into this branch. Example: "refs/heads/master"'),
    top: z.number().optional().describe('The number of pull requests to retrieve.')
});

const PullRequestSchema = z.object({
    pullRequestId: z.number().optional(),
    codeReviewId: z.number().optional(),
    status: z.string().optional(),
    createdBy: IdentityRefSchema.optional(),
    creationDate: z.string().optional(),
    closedDate: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    sourceRefName: z.string().optional(),
    targetRefName: z.string().optional(),
    mergeStatus: z.string().optional(),
    mergeId: z.string().optional(),
    lastMergeSourceCommit: GitCommitRefSchema.optional(),
    lastMergeTargetCommit: GitCommitRefSchema.optional(),
    lastMergeCommit: GitCommitRefSchema.optional(),
    reviewers: z.array(IdentityRefWithVoteSchema).optional(),
    url: z.string().optional(),
    repository: GitRepositorySchema.optional(),
    supportsIterations: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    completionQueueTime: z.string().optional(),
    closedBy: IdentityRefSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(PullRequestSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page. Pass this value as the cursor input to retrieve the next page.')
});

const action = createAction({
    description: 'List pull requests in a repository with searchCriteria filters.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-pull-requests',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            'api-version': '7.2-preview.1'
        };

        if (input.status !== undefined) {
            params['searchCriteria.status'] = input.status;
        }
        if (input.sourceRefName !== undefined) {
            params['searchCriteria.sourceRefName'] = input.sourceRefName;
        }
        if (input.targetRefName !== undefined) {
            params['searchCriteria.targetRefName'] = input.targetRefName;
        }
        if (input.top !== undefined) {
            params['$top'] = input.top;
        }
        if (input.cursor !== undefined) {
            params['continuationToken'] = input.cursor;
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-requests?view=azure-devops-rest-7.2
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pullrequests`,
            params,
            retries: 3
        });

        const parsed = PullRequestListResponseSchema.parse(response.data);
        const rawItems = parsed.value ?? [];

        const items = rawItems.map((item) => {
            const pr = GitPullRequestSchema.parse(item);
            return {
                ...(pr.pullRequestId !== undefined && { pullRequestId: pr.pullRequestId }),
                ...(pr.codeReviewId !== undefined && { codeReviewId: pr.codeReviewId }),
                ...(pr.status !== undefined && { status: pr.status }),
                ...(pr.createdBy !== undefined && { createdBy: pr.createdBy }),
                ...(pr.creationDate !== undefined && { creationDate: pr.creationDate }),
                ...(pr.closedDate !== undefined && { closedDate: pr.closedDate }),
                ...(pr.title !== undefined && { title: pr.title }),
                ...(pr.description !== undefined && { description: pr.description }),
                ...(pr.sourceRefName !== undefined && { sourceRefName: pr.sourceRefName }),
                ...(pr.targetRefName !== undefined && { targetRefName: pr.targetRefName }),
                ...(pr.mergeStatus !== undefined && { mergeStatus: pr.mergeStatus }),
                ...(pr.mergeId !== undefined && { mergeId: pr.mergeId }),
                ...(pr.lastMergeSourceCommit !== undefined && { lastMergeSourceCommit: pr.lastMergeSourceCommit }),
                ...(pr.lastMergeTargetCommit !== undefined && { lastMergeTargetCommit: pr.lastMergeTargetCommit }),
                ...(pr.lastMergeCommit !== undefined && { lastMergeCommit: pr.lastMergeCommit }),
                ...(pr.reviewers !== undefined && { reviewers: pr.reviewers }),
                ...(pr.url !== undefined && { url: pr.url }),
                ...(pr.repository !== undefined && { repository: pr.repository }),
                ...(pr.supportsIterations !== undefined && { supportsIterations: pr.supportsIterations }),
                ...(pr.isDraft !== undefined && { isDraft: pr.isDraft }),
                ...(pr.completionQueueTime !== undefined && { completionQueueTime: pr.completionQueueTime }),
                ...(pr.closedBy !== undefined && { closedBy: pr.closedBy })
            };
        });

        const nextCursor = response.headers['x-ms-continuationtoken'];

        return {
            items,
            ...(nextCursor !== undefined && nextCursor !== null && { nextCursor: String(nextCursor) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
