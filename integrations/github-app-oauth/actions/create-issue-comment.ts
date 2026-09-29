import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        issue_or_pr_number: z
            .number()
            .describe('The number that identifies the issue or pull request. GitHub models PR conversation comments through the same issues endpoint.'),
        body: z.string().describe('The contents of the comment.')
    })
    .describe('Input to create a comment on an issue or pull request.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the comment.'),
        node_id: z.string().describe('The Node ID of the comment.'),
        html_url: z.string().describe('The URL to view the comment in a browser.'),
        body: z.string().optional().describe('The contents of the comment.'),
        created_at: z.string().describe('The time the comment was created in ISO 8601 format.'),
        updated_at: z.string().describe('The time the comment was last updated in ISO 8601 format.'),
        issue_url: z.string().describe('The URL of the issue or pull request this comment belongs to.'),
        author_association: z.string().optional().describe("The author's association with the repository."),
        user: z
            .object({
                login: z.string().describe('The login username of the user.'),
                id: z.number().describe('The unique identifier of the user.'),
                node_id: z.string().describe('The Node ID of the user.'),
                avatar_url: z.string().describe("The URL of the user's avatar image."),
                html_url: z.string().describe("The URL to view the user's profile in a browser."),
                type: z.string().describe('The type of user (e.g., User, Bot, Organization).')
            })
            .optional()
            .describe('The user who created the comment.')
    })
    .describe('The created issue or pull request comment.');

/**
 * @tags: [write]
 * @tagReason: Creates a new comment on an issue or pull request via a POST request.
 * @pitfalls: GitHub routes PR conversation comments through the issues endpoint, so this works on pull requests even when Issues are disabled; rapid creation may trigger secondary rate limiting.
 */
const action = createAction({
    description: 'Create a comment on an issue or pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_or_pr_number}/comments`,
            data: {
                body: input.body
            },
            retries: 1
        });

        const providerComment = z
            .object({
                id: z.number(),
                node_id: z.string(),
                html_url: z.string(),
                body: z.string().optional(),
                created_at: z.string(),
                updated_at: z.string(),
                issue_url: z.string(),
                author_association: z.string().optional(),
                user: z
                    .object({
                        login: z.string(),
                        id: z.number(),
                        node_id: z.string(),
                        avatar_url: z.string(),
                        html_url: z.string(),
                        type: z.string()
                    })
                    .optional()
            })
            .parse(response.data);

        return {
            id: providerComment.id,
            node_id: providerComment.node_id,
            html_url: providerComment.html_url,
            ...(providerComment.body !== undefined && { body: providerComment.body }),
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            issue_url: providerComment.issue_url,
            ...(providerComment.author_association !== undefined && { author_association: providerComment.author_association }),
            ...(providerComment.user !== undefined && {
                user: {
                    login: providerComment.user.login,
                    id: providerComment.user.id,
                    node_id: providerComment.user.node_id,
                    avatar_url: providerComment.user.avatar_url,
                    html_url: providerComment.user.html_url,
                    type: providerComment.user.type
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
