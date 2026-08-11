import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('The name of the repository. Example: "nango".'),
        issue_or_pr_number: z
            .number()
            .describe('The number of the issue or pull request to comment on. GitHub accepts PR numbers here even when Issues is disabled.'),
        body: z.string().describe('The text body of the comment to create.')
    })
    .describe('Input to create a comment on a GitHub issue or pull request.');

const ProviderUserSchema = z.object({
    id: z.number(),
    login: z.string(),
    html_url: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    html_url: z.string(),
    body: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: ProviderUserSchema
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the created comment.'),
        node_id: z.string().describe('The global node ID of the created comment.'),
        html_url: z.string().describe('The URL to view the comment in a browser.'),
        body: z.string().describe('The text body of the created comment.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the comment was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the comment was last updated.'),
        user: z
            .object({
                id: z.number().describe('The unique identifier of the user who authored the comment.'),
                login: z.string().describe('The username of the comment author.'),
                html_url: z.string().describe("The URL to the comment author's GitHub profile.")
            })
            .describe('The GitHub user who created the comment.')
    })
    .describe('The created GitHub issue or pull request comment.');

/**
 * @tags: [write]
 * @tagReason: Creates a new comment on an issue or pull request via GitHub's REST API.
 */
const action = createAction({
    description: 'Create a comment on an issue or pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write', 'pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/issues/comments#create-an-issue-comment
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_or_pr_number}/comments`,
            data: {
                body: input.body
            },
            retries: 1
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            node_id: providerComment.node_id,
            html_url: providerComment.html_url,
            body: providerComment.body,
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            user: {
                id: providerComment.user.id,
                login: providerComment.user.login,
                html_url: providerComment.user.html_url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
