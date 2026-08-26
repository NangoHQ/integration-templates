import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to clear the custom field value on.'),
        custom_field_id: z.number().describe('The ID of the custom field whose value should be cleared.')
    })
    .describe('Input for clearing a single custom field value on a ticket.');

const OutputSchema = z.null().describe('No response body on success.');

/**
 * @tags: [write, destructive]
 * @tagReason: Clears a single custom field value from a ticket by deleting it.
 * @pitfalls: Returns 400 if no value is currently set for this custom field on the ticket.
 */
const action = createAction({
    description: 'Clear a single custom field value on a ticket',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<null> => {
        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/delete-ticket-custom-field-value
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/custom-fields/${encodeURIComponent(input.custom_field_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
