import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The ID of the team to remove the user from. Example: "PCMEK0B"'),
        user_id: z.string().describe('The ID of the user to remove from the team. Example: "PJB72P3"')
    })
    .describe('Parameters required to remove a user from a PagerDuty team.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a team membership relationship via DELETE /teams/{id}/users/{user_id}.
 */
const action = createAction({
    description: 'Remove a user from a team.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null response indicating the user was successfully removed from the team.'),
    scopes: ['teams.write'],

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developer.pagerduty.com/api-reference/5dd16349e207a-remove-a-user-from-a-team
            endpoint: `/teams/${encodeURIComponent(input.team_id)}/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
