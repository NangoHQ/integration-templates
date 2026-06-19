import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name.'),
    repositoryId: z.string().describe('The repository ID of the pull request target branch.'),
    pullRequestId: z.number().describe('ID of the pull request.')
});

const CommentPositionSchema = z
    .object({
        line: z.number().optional(),
        offset: z.number().optional()
    })
    .passthrough();

const CommentThreadContextSchema = z
    .object({
        filePath: z.string().optional(),
        leftFileStart: CommentPositionSchema.optional(),
        leftFileEnd: CommentPositionSchema.optional(),
        rightFileStart: CommentPositionSchema.optional(),
        rightFileEnd: CommentPositionSchema.optional()
    })
    .passthrough();

const CommentIterationContextSchema = z
    .object({
        firstComparingIteration: z.number().optional(),
        secondComparingIteration: z.number().optional()
    })
    .passthrough();

const CommentTrackingCriteriaSchema = z
    .object({
        firstComparingIteration: z.number().optional(),
        secondComparingIteration: z.number().optional(),
        origFilePath: z.string().optional(),
        origLeftFileStart: CommentPositionSchema.optional(),
        origLeftFileEnd: CommentPositionSchema.optional(),
        origRightFileStart: CommentPositionSchema.optional(),
        origRightFileEnd: CommentPositionSchema.optional()
    })
    .passthrough();

const GitPullRequestCommentThreadContextSchema = z
    .object({
        changeTrackingId: z.number().optional(),
        iterationContext: CommentIterationContextSchema.optional(),
        trackingCriteria: CommentTrackingCriteriaSchema.optional()
    })
    .passthrough();

const IdentityRefSchema = z
    .object({
        id: z.string().optional(),
        displayName: z.string().optional(),
        uniqueName: z.string().optional(),
        url: z.string().optional(),
        imageUrl: z.string().optional(),
        isContainer: z.boolean().optional()
    })
    .passthrough();

const CommentSchema = z
    .object({
        id: z.number().optional(),
        parentCommentId: z.number().optional(),
        author: IdentityRefSchema.optional(),
        content: z.string().optional(),
        commentType: z.string().optional(),
        publishedDate: z.string().optional(),
        lastUpdatedDate: z.string().optional(),
        lastContentUpdatedDate: z.string().optional(),
        isDeleted: z.boolean().optional(),
        usersLiked: z.array(IdentityRefSchema).optional()
    })
    .passthrough();

const GitPullRequestCommentThreadSchema = z
    .object({
        id: z.number().optional(),
        comments: z.array(CommentSchema).optional(),
        publishedDate: z.string().optional(),
        lastUpdatedDate: z.string().optional(),
        status: z.string().optional(),
        threadContext: CommentThreadContextSchema.nullable().optional(),
        pullRequestThreadContext: GitPullRequestCommentThreadContextSchema.nullable().optional(),
        properties: z.record(z.string(), z.unknown()).nullable().optional(),
        identities: z.record(z.string(), z.unknown()).nullable().optional(),
        isDeleted: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    threads: z.array(GitPullRequestCommentThreadSchema)
});

const action = createAction({
    description: 'List comment threads on a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code', 'vso.threads_full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-request-threads/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pullRequests/${input.pullRequestId}/threads`,
            params: {
                'api-version': '7.2-preview.1'
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Azure DevOps API.'
            });
        }

        const responseSchema = z.object({
            value: z.array(z.unknown()).optional()
        });

        const parsedData = responseSchema.parse(response.data);
        const rawThreads = parsedData.value || [];

        const threads = rawThreads.map((thread) => {
            return GitPullRequestCommentThreadSchema.parse(thread);
        });

        return {
            threads
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
