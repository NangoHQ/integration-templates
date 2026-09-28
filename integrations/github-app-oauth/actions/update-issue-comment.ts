import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository.'),
        comment_id: z.number().describe('The unique identifier of the comment.'),
        body: z.string().describe('The new body text for the comment.')
    })
    .describe('Input parameters for updating an existing issue or pull request comment.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the comment.'),
        body: z.string().describe('The body text of the comment.'),
        html_url: z.string().describe('The URL of the comment in the browser.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the comment was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the comment was last updated.'),
        user_login: z.string().describe('The login username of the comment author.')
    })
    .describe('The updated comment returned after a successful update.');

const ProviderUserSchema = z.object({
    login: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    body: z.string(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: ProviderUserSchema
});

/**
 * @tags: [write]
 * @tagReason: Sends a PATCH request to GitHub to update an existing issue or pull request comment body.
 * @pitfalls: This action updates both issue and pull request comments, and it succeeds even when the target repository has Issues disabled.
 */
const action = createAction({
    description: 'Update the body of an existing comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/issues/comments#update-an-issue-comment
        const response = await nango.patch({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/comments/${encodeURIComponent(String(input.comment_id))}`,
            data: {
                body: input.body
            },
            retries: 3
        });

        const comment = ProviderCommentSchema.parse(response.data);

        return {
            id: comment.id,
            body: comment.body,
            html_url: comment.html_url,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user_login: comment.user.login
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
