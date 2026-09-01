import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project that contains the card table column.'),
        columnId: z.number().describe('The ID of the card table column to unsubscribe from.')
    })
    .describe('Input to unsubscribe the current user from a card table column.');

/**
 * @tags: [write, destructive]
 * @tagReason: Unsubscribes the current user from a card table column, revoking notification access.
 * @pitfalls: A 404 response can mean the column is missing, the caller lacks permission, or the account subscription has lapsed.
 */
const action = createAction({
    description: 'Unsubscribe the current user from notifications for a Card Table column.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content is returned on success.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_columns.md
        await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/lists/${encodeURIComponent(input.columnId)}/subscription.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
