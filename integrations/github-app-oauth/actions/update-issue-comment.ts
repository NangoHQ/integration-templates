import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        comment_id: z.number().describe('The unique identifier of the comment. Example: 123456'),
        body: z.string().describe('The updated text of the comment.')
    })
    .describe('Input to update an existing issue or pull request comment.');

const ProviderUserSchema = z
    .object({
        login: z.string().describe('The username of the user.'),
        id: z.number().describe('The unique identifier of the user.'),
        node_id: z.string().describe('The node ID of the user.')
    })
    .passthrough();

const ProviderCommentSchema = z
    .object({
        id: z.number(),
        node_id: z.string(),
        html_url: z.string(),
        body: z.string(),
        user: ProviderUserSchema.nullable().optional(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the comment.'),
        node_id: z.string().describe('The node ID of the comment.'),
        html_url: z.string().describe('The URL to view the comment in a browser.'),
        body: z.string().describe('The text of the comment.'),
        user: ProviderUserSchema.optional().describe('The user who authored the comment.'),
        created_at: z.string().describe('The timestamp when the comment was created.'),
        updated_at: z.string().describe('The timestamp when the comment was last updated.')
    })
    .describe('The updated issue or pull request comment.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing issue or pull request comment on the provider.
 * @pitfalls: Also updates pull request comments, and succeeds even when the repository has Issues disabled.
 */
const action = createAction({
    description: 'Update the body of an existing issue or pull request comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.github.com/rest/issues/comments#update-an-issue-comment
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/comments/${encodeURIComponent(String(input.comment_id))}`,
            data: {
                body: input.body
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            node_id: providerComment.node_id,
            html_url: providerComment.html_url,
            body: providerComment.body,
            ...(providerComment.user != null && { user: providerComment.user }),
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
