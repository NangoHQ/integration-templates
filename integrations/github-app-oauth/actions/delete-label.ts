import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository.'),
        name: z.string().describe('The name of the label to delete.')
    })
    .describe('Parameters to delete a repository label by name.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a repository label from GitHub; this removes the label from all associated issues and pull requests.
 * @pitfalls: Works on repositories with Issues disabled, unlike create-issue which 410s in that configuration.
 */
const action = createAction({
    description: 'Delete a repository label by name.',
    version: '1.0.1',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the label was deleted successfully.'),
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://docs.github.com/rest/issues/labels#delete-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
