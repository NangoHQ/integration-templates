import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project that contains the card table column.'),
        columnId: z.number().describe('The ID of the card table column to subscribe to.')
    })
    .describe('Input for subscribing to notifications on a card table column.');

/**
 * @tags: [write]
 * @tagReason: Subscribes the current user to notifications for a card table column.
 */
const action = createAction({
    description: 'Subscribe the current user to notifications for a Card Table column.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating successful subscription.'),

    exec: async (nango, input): Promise<null> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_columns.md
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/lists/${encodeURIComponent(input.columnId)}/subscription.json`,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Unexpected status ${response.status} from subscription endpoint.`,
                status: response.status
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
