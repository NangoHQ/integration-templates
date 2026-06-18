import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangodev"'),
    repositoryId: z.string().describe('Repository ID. Example: "46eadaf5-eb36-43bc-8297-a9b4043afd09"'),
    pullRequestId: z.number().describe('Pull request ID. Example: 1'),
    content: z.string().describe('Comment content. Example: "Looks good!"')
});

const AuthorSchema = z
    .object({
        displayName: z.string().optional(),
        id: z.string().optional(),
        uniqueName: z.string().optional(),
        imageUrl: z.string().optional()
    })
    .passthrough();

const CommentSchema = z
    .object({
        id: z.number().optional(),
        parentCommentId: z.number().optional(),
        author: AuthorSchema.optional(),
        content: z.string().optional(),
        publishedDate: z.string().optional(),
        lastUpdatedDate: z.string().optional(),
        lastContentUpdatedDate: z.string().optional(),
        commentType: z.string().optional()
    })
    .passthrough();

const ThreadSchema = z
    .object({
        id: z.number(),
        publishedDate: z.string().optional(),
        lastUpdatedDate: z.string().optional(),
        comments: z.array(CommentSchema).optional(),
        status: z.string().optional(),
        threadContext: z.unknown().optional(),
        properties: z.unknown().optional(),
        identities: z.unknown().optional(),
        isDeleted: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Add a comment thread to a pull request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-pr-thread',
        group: 'Pull Requests'
    },
    input: InputSchema,
    output: ThreadSchema,
    scopes: ['vso.code_write', 'vso.code'],

    exec: async (nango, input): Promise<z.infer<typeof ThreadSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-request-threads/create?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pullrequests/${input.pullRequestId}/threads`,
            params: {
                'api-version': '7.2-preview.1'
            },
            data: {
                comments: [
                    {
                        parentCommentId: 0,
                        content: input.content,
                        commentType: 1
                    }
                ],
                status: 1
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Azure DevOps returned an empty response when creating the PR thread.'
            });
        }

        const thread = ThreadSchema.parse(response.data);
        return thread;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
