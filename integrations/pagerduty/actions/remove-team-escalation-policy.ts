import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The ID of the team whose escalation-policy association should be removed.'),
        escalation_policy_id: z.string().describe('The ID of the escalation policy to disassociate from the team.')
    })
    .describe('Input for removing an escalation policy association from a team.');

const OutputSchema = z.null().describe('Output confirming the escalation policy association was removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an escalation-policy association from a team on the provider.
 * @pitfalls: A team may still be blocked from deletion after this call if it retains service associations; this action only removes the escalation-policy link.
 */
const action = createAction({
    description: "Remove an escalation policy's association with a team.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams.write'],

    exec: async (nango, input) => {
        // https://developer.pagerduty.com/api-reference/e65eafb4e8c5f-remove-team-escalation-policy
        await nango.delete({
            endpoint: `/teams/${encodeURIComponent(input.team_id)}/escalation_policies/${encodeURIComponent(input.escalation_policy_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
