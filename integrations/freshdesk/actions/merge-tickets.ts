import { z } from 'zod';
import { createAction } from 'nango';

const NoteInputSchema = z.object({
    body: z.string().describe('Note body text to add during merge.'),
    private: z.boolean().describe('Whether the note is private (true) or public (false).')
});

const InputSchema = z
    .object({
        primary_id: z.number().int().describe('ID of the primary ticket that will retain all conversations after the merge.'),
        ticket_ids: z.array(z.number().int()).describe('IDs of the secondary tickets to merge into the primary ticket.'),
        note_in_primary: NoteInputSchema.optional().describe('Optional note to add to the primary ticket after merging.'),
        note_in_secondary: NoteInputSchema.optional().describe('Optional note to add to the secondary tickets after merging.'),
        convert_recepients_to_cc: z.boolean().optional().describe('When true, recipients from secondary tickets are added as CC on the primary ticket.')
    })
    .describe('Input to merge one or more Freshdesk tickets into a primary ticket.');

const OutputSchema = z.null().describe('No content returned on successful merge.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merges secondary tickets into a primary ticket, permanently moving their conversations and altering the secondary tickets.
 * @pitfalls: The primary ticket ID must also appear in the `ticket_ids` array; omitting note fields causes the provider to add default notes automatically, and merged secondary tickets cannot be unmerged.
 */
const action = createAction({
    description: 'Merge one or more Freshdesk tickets.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#merge_tickets
        await nango.put({
            endpoint: '/api/v2/tickets/merge',
            data: {
                primary_id: input.primary_id,
                ticket_ids: input.ticket_ids,
                ...(input.note_in_primary !== undefined && { note_in_primary: input.note_in_primary }),
                ...(input.note_in_secondary !== undefined && { note_in_secondary: input.note_in_secondary }),
                ...(input.convert_recepients_to_cc !== undefined && { convert_recepients_to_cc: input.convert_recepients_to_cc })
            },
            retries: 1
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
