import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The unique identifier of the team to delete.')
    })
    .describe('Input for deleting a PagerDuty team.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a team from the PagerDuty account.
 * @pitfalls: Fails with HTTP 400 if the team still has escalation-policy or service associations; remove those first. Unresolved incidents are detached asynchronously and may not finish before the call returns.
 */
const action = createAction({
    description: 'Delete a team.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty success response for a deleted team.'),
    scopes: ['teams.write'],

    exec: async (nango, input): Promise<null> => {
        const validatedInput = InputSchema.parse(input);

        await nango.delete({
            // https://developer.pagerduty.com/api-reference/001b6019b9970-delete-a-team
            endpoint: `/teams/${encodeURIComponent(validatedInput.team_id)}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
