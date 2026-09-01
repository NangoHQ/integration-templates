import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to remove tags from.'),
        names: z.array(z.string()).optional().describe('Tag names to remove. Each tag must already exist on the ticket.'),
        ids: z.array(z.number()).optional().describe('Tag IDs to remove. Each tag must already exist on the ticket.')
    })
    .describe('Input for removing tags from a ticket.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the removal was successful.')
    })
    .describe('Output confirming tag removal from a ticket.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes tag associations from a ticket.
 * @pitfalls: Tag names and IDs must refer to existing global tags or the call returns 400.
 */
const action = createAction({
    description: 'Remove one or more tags from a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { names?: string[]; ids?: number[] } = {};
        if (input.names !== undefined) {
            body.names = input.names;
        }
        if (input.ids !== undefined) {
            body.ids = input.ids;
        }

        // https://developers.gorgias.com/reference/delete-ticket-tags
        await nango.delete({
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/tags`,
            data: body,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
