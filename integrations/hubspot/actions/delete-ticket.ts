import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticket_id: z.string().describe('The ID of the ticket to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    ticket_id: z.string()
});

const action = createAction({
    description: 'Delete a support ticket',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-ticket',
        group: 'Tickets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/guide
        await nango.delete({
            endpoint: `/crm/v3/objects/tickets/${input.ticket_id}`,
            retries: 10
        });

        return {
            success: true,
            ticket_id: input.ticket_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
