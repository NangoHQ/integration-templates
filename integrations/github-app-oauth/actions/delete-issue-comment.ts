import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        comment_id: z.number().describe('The unique identifier of the issue or pull request comment.')
    })
    .describe('Input parameters for deleting an issue or pull request comment.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing issue or pull request comment permanently from GitHub.
 * @pitfalls: Deletes both issue and pull request comments, and works even on repositories where the Issues feature is disabled.
 */
const action = createAction({
    description: 'Delete an issue or pull request comment.',
    version: '1.0.1',
    input: InputSchema,
    output: z.null(),
    scopes: ['issues:write'],
    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#delete-an-issue-comment
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/comments/${encodeURIComponent(String(input.comment_id))}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
