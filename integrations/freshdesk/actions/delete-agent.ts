import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        agent_id: z.number().describe('The unique ID of the agent to delete. Example: 123')
    })
    .describe('Input for deleting a Freshdesk agent.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the agent by downgrading them to a contact. This removes agent privileges and is difficult to reverse.
 * @pitfalls: Deleting an agent downgrades them to a contact instead of permanently removing the record.
 */
const action = createAction({
    description: 'Delete or archive a agent in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response confirming the agent was deleted.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#delete_agent
        await nango.delete({
            endpoint: `/api/v2/agents/${encodeURIComponent(String(input.agent_id))}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
