import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        branch: z.string().describe('Name of the branch to delete. Example: "feature-branch"')
    })
    .describe('Input for deleting a git branch.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a git branch from the repository.
 * @pitfalls: Deleting a non-existent branch returns a 422 error rather than 404.
 */
const action = createAction({
    description: 'Delete a branch.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response confirming the branch was deleted.'),
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://docs.github.com/rest/git/refs#delete-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs/heads/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
