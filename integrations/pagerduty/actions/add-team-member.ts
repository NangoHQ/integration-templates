import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The ID of the team to add the user to.'),
        user_id: z.string().describe('The ID of the user to add to the team.'),
        role: z.string().describe('The role to assign the user on this team. Valid values include observer, responder, and manager.')
    })
    .describe('Input for adding a user to a PagerDuty team with a specific role.');

/**
 * @tags: [write]
 * @tagReason: Mutates team membership by assigning a user to a team with a specific role.
 * @pitfalls: Users with the account owner role cannot be assigned certain team roles such as responder; the API returns a validation error.
 */
const action = createAction({
    description: 'Add a user to a team with a given role.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response returned on successful team member addition.'),
    scopes: ['teams.write'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.pagerduty.com/api-reference/c2NoOTI0Mg
        await nango.put({
            endpoint: `/teams/${encodeURIComponent(input.team_id)}/users/${encodeURIComponent(input.user_id)}`,
            data: {
                role: input.role
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
