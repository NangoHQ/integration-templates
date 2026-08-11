import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        release_id: z.number().int().positive().describe('Release ID to delete. Example: 12345')
    })
    .describe('Parameters for deleting a GitHub release');

const OutputSchema = z.object({}).describe('Empty success response indicating the release was deleted');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a GitHub release permanently. The operation is irreversible and removes the release metadata from the repository.
 * @pitfalls: Deleting a release does not delete the underlying git tag; delete the tag separately if desired.
 */
const action = createAction({
    description: 'Delete a release (does NOT delete the underlying git tag — delete that separately via the git refs API if desired).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://docs.github.com/rest/releases/releases#delete-a-release
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${input.release_id}`,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
