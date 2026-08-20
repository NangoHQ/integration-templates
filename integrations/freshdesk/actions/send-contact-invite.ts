import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.number().describe('Freshdesk contact ID to send the portal invitation to. Example: 432')
    })
    .describe('Input for sending a portal invitation email to a Freshdesk contact');

/**
 * @tags: [write]
 * @tagReason: Sends a portal invitation email to the specified Freshdesk contact, which updates the contact state on the provider.
 */
const action = createAction({
    description: 'Send a portal invitation email to a Freshdesk contact',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty output indicating the portal invitation was sent successfully'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#send_invite
        await nango.put({
            endpoint: `/api/v2/contacts/${encodeURIComponent(input.contact_id)}/send_invite`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
