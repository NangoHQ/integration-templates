import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        comment_id: z.number().describe('The unique identifier of the comment.')
    })
    .describe('Parameters for deleting a GitHub issue or pull request comment.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a comment from the provider. This operation cannot be undone.
 * @pitfalls: Deletes both issue and pull request comments, and succeeds even when the repository has the Issues feature disabled.
 */
const action = createAction({
    description: 'Delete Issue/PR Comment',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content returned on successful deletion.'),
    scopes: ['issues:write'],

    exec: async (nango, input) => {
        await nango.delete({
            // https://docs.github.com/en/rest/issues/comments#delete-an-issue-comment
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/comments/${encodeURIComponent(String(input.comment_id))}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
