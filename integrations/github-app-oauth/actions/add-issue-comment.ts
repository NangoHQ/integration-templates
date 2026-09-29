import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        issue_number: z.number().describe('The number that identifies the issue or pull request. Example: 1'),
        body: z.string().describe('The contents of the comment in markdown. Example: "This is a test comment."')
    })
    .describe('Input for adding a comment to a GitHub issue or pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    html_url: z.string(),
    type: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    html_url: z.string(),
    body: z.string(),
    user: ProviderUserSchema,
    created_at: z.string(),
    updated_at: z.string(),
    issue_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the comment. Example: 123456789'),
        node_id: z.string().describe('The node ID of the comment. Example: "IC_kwDOB4J3VM5T7O1S"'),
        html_url: z.string().describe('The URL to view the comment in a browser. Example: "https://github.com/owner/repo/issues/1#issuecomment-123456789"'),
        body: z.string().describe('The contents of the comment in markdown. Example: "This is a test comment."'),
        user: z
            .object({
                login: z.string().describe('The username of the comment author. Example: "nango-bot"'),
                id: z.number().describe('The unique identifier of the comment author. Example: 123456789'),
                node_id: z.string().describe('The node ID of the comment author. Example: "MDQ6VXNlcjEyMzQ1Njc4OQ=="'),
                avatar_url: z.string().describe('The URL of the comment author\'s avatar. Example: "https://avatars.githubusercontent.com/u/123456789?v=4"'),
                html_url: z.string().describe('The URL of the comment author\'s profile. Example: "https://github.com/nango-bot"'),
                type: z.string().describe('The type of user. Example: "Bot"')
            })
            .describe('The user who created the comment.'),
        created_at: z.string().describe('The timestamp when the comment was created. Example: "2024-01-01T00:00:00Z"'),
        updated_at: z.string().describe('The timestamp when the comment was last updated. Example: "2024-01-01T00:00:00Z"'),
        issue_url: z.string().describe('The API URL of the issue or pull request. Example: "https://api.github.com/repos/owner/repo/issues/1"')
    })
    .describe('The newly created GitHub issue or pull request comment.');

/**
 * @tags: [write]
 * @tagReason: Creates a new comment on a GitHub issue or pull request.
 * @pitfalls: Comments can be added to pull requests with the same action, and this succeeds even when Issues is disabled on the repository.
 */
const action = createAction({
    description: 'Create a new comment on an issue or pull request discussion thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/issues/comments#create-an-issue-comment
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${encodeURIComponent(String(input.issue_number))}/comments`,
            data: {
                body: input.body
            },
            retries: 10
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            node_id: providerComment.node_id,
            html_url: providerComment.html_url,
            body: providerComment.body,
            user: {
                login: providerComment.user.login,
                id: providerComment.user.id,
                node_id: providerComment.user.node_id,
                avatar_url: providerComment.user.avatar_url,
                html_url: providerComment.user.html_url,
                type: providerComment.user.type
            },
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            issue_url: providerComment.issue_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
