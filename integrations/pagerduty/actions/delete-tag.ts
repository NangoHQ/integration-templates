import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the tag to delete. Example: "P1234567"')
    })
    .describe('Input parameters for deleting a PagerDuty tag.');

const OutputSchema = z.null().describe('Empty response indicating the tag was successfully deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a tag from the PagerDuty account. Deleting a tag implicitly removes its assignment from any entity that had it.
 * @pitfalls: Deleting a tag globally unassigns it from every user, team, and escalation policy that carries it; use the assign-entity-tags action to remove a tag from a single entity without deleting it account-wide.
 */
const action = createAction({
    description: 'Delete a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1tags~1%7Bid%7D/delete
        await nango.delete({
            endpoint: `/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
