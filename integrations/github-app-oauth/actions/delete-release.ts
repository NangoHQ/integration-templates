import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        release_id: z.number().int().describe('The unique identifier of the release to delete. Example: 398417965')
    })
    .describe('Identifies the repository and the release to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the release was successfully deleted')
    })
    .describe('Result of deleting the release.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a release from the repository.
 * @pitfalls: Deleting a release does not delete its underlying git tag; delete the tag separately via the git refs API if it should also be removed. Because the tag survives, recreating a release with the same tag name reuses the existing tag and ignores the requested target commit.
 */
const action = createAction({
    description: 'Delete a release. The underlying git tag is not deleted by this call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/releases/releases#delete-a-release
        await nango.delete({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${input.release_id}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
