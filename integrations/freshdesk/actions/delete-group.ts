import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Freshdesk group ID to delete. Example: 12345')
    })
    .describe('Input to delete a Freshdesk group');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently disbands the group; deleted groups cannot be restored.
 * @pitfalls: Deleting a group does not delete its members, and deleted groups cannot be restored.
 */
const action = createAction({
    description: 'Delete or archive a group in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty success response'),

    exec: async (nango, input): Promise<null> => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#delete_group
            endpoint: `/api/v2/groups/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.delete(config);

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected status ${response.status} from Freshdesk`,
                status: response.status
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
