import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The ID of the escalation policy to delete.')
    })
    .describe('Input for deleting an escalation policy.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an escalation policy from the provider.
 * @pitfalls: Deletion fails while the policy is still referenced by a service; delete or reassign that service first.
 */
const action = createAction({
    description: 'Delete an escalation policy.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response on successful deletion.'),
    scopes: ['escalation_policies.write'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.pagerduty.com/api-reference/
        await nango.delete({
            endpoint: `/escalation_policies/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
