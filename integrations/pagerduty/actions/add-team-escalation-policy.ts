import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The unique identifier of the team to associate with the escalation policy. Example: "PEV95L9"'),
        escalation_policy_id: z.string().describe('The unique identifier of the escalation policy to associate with the team. Example: "P3V8JYU"')
    })
    .describe('Input to associate an escalation policy with a team.');

/**
 * @tags: [write]
 * @tagReason: Associates an escalation policy with a team via a PUT request.
 * @pitfalls: The association will fail with a 400 error if the escalation policy is already assigned to another team, and it blocks deleting the team until the association is removed.
 */
const action = createAction({
    description: 'Associate an escalation policy with a team.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating successful association.'),
    scopes: ['teams.write'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.pagerduty.com/api-reference/YXBjOjI3NDgyNTQ-teams-add-escalation-policy
        await nango.put({
            endpoint: `/teams/${encodeURIComponent(input.team_id)}/escalation_policies/${encodeURIComponent(input.escalation_policy_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
