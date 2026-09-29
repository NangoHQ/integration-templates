import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        branch: z.string().describe('The name of the branch to delete, without the refs/heads/ prefix. Example: "my-feature-branch"')
    })
    .describe('The repository and branch identifying which git branch ref to delete');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the branch was deleted successfully. GitHub returns a 204 No Content response when the deletion succeeds.')
    })
    .describe('Confirmation that the branch was deleted');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the branch's git ref from the repository, permanently removing the branch.
 * @pitfalls: Deleting a branch does not delete its commits, and GitHub automatically closes any open pull requests whose head branch is deleted.
 */
const action = createAction({
    description: 'Delete a branch',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/git/refs#delete-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs/heads/${encodeURIComponent(input.branch)}`,
            retries: 3
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
