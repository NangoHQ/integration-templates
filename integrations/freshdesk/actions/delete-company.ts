import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Company ID to delete. Example: 123')
    })
    .describe('Input for deleting a company in Freshdesk.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a company from Freshdesk. Associated contacts are not deleted, but their company association is removed. Once deleted, a company cannot be restored.
 * @pitfalls: Deleting a company is permanent with no restore option; associated contacts are not deleted but lose their company association.
 */
const action = createAction({
    description: 'Delete or archive a company in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developers.freshdesk.com/api/#delete_company
            endpoint: `/api/v2/companies/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
