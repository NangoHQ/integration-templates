import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.number().describe('The unique identifier of the team to delete.')
    })
    .describe('Input for deleting a team.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a team from the provider.
 * @pitfalls: Requires the `users:write` OAuth scope; connections without it will fail with a 403 error.
 */
const action = createAction({
    description: 'Delete a team',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty output for a successful delete.'),
    scopes: ['users:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/delete-team
        await nango.delete({
            endpoint: `/api/teams/${encodeURIComponent(input.team_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
