import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangodev"'),
    repositoryId: z.string().describe('Repository ID. Example: "46eadaf5-eb36-43bc-8297-a9b4043afd09"'),
    title: z.string().describe('Pull request title.'),
    description: z.string().optional().describe('Pull request description.'),
    sourceRefName: z.string().describe('Source branch ref. Example: "refs/heads/feature-branch"'),
    targetRefName: z.string().describe('Target branch ref. Example: "refs/heads/main"'),
    isDraft: z.boolean().optional().describe('Whether the pull request is a draft.')
});

const CreatedBySchema = z.object({
    displayName: z.string(),
    id: z.string(),
    uniqueName: z.string().optional()
});

const ProviderPullRequestSchema = z.object({
    pullRequestId: z.number(),
    codeReviewId: z.number().optional(),
    status: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    isDraft: z.boolean().optional().nullable(),
    mergeStatus: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    creationDate: z.string().optional().nullable(),
    createdBy: CreatedBySchema.optional().nullable()
});

const OutputSchema = z.object({
    pullRequestId: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().optional(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    isDraft: z.boolean().optional(),
    mergeStatus: z.string().optional(),
    url: z.string().optional(),
    creationDate: z.string().optional(),
    createdBy: z
        .object({
            displayName: z.string(),
            id: z.string(),
            uniqueName: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a pull request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-pull-request',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            title: string;
            sourceRefName: string;
            targetRefName: string;
            description?: string;
            isDraft?: boolean;
        } = {
            title: input.title,
            sourceRefName: input.sourceRefName,
            targetRefName: input.targetRefName
        };

        if (input.description !== undefined) {
            body.description = input.description;
        }

        if (input.isDraft !== undefined) {
            body.isDraft = input.isDraft;
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/create?view=azure-devops-rest-7.2
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pullrequests`,
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
            ...(providerPullRequest.isDraft != null && { isDraft: providerPullRequest.isDraft }),
            ...(providerPullRequest.mergeStatus != null && { mergeStatus: providerPullRequest.mergeStatus }),
            ...(providerPullRequest.url != null && { url: providerPullRequest.url }),
            ...(providerPullRequest.creationDate != null && { creationDate: providerPullRequest.creationDate }),
            ...(providerPullRequest.createdBy != null && {
                createdBy: {
                    displayName: providerPullRequest.createdBy.displayName,
                    id: providerPullRequest.createdBy.id,
                    ...(providerPullRequest.createdBy.uniqueName !== undefined && {
                        uniqueName: providerPullRequest.createdBy.uniqueName
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
