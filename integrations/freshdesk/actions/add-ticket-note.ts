import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('Freshdesk ticket ID to which the note will be added.'),
        body: z.string().describe('Note content. May contain HTML.'),
        private: z.boolean().optional().describe('Whether the note is private (visible only to agents). Defaults to false (public) if omitted.')
    })
    .describe('Input for adding a note to a Freshdesk ticket.');

const ProviderConversationSchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    body: z.string(),
    body_text: z.string(),
    private: z.boolean(),
    user_id: z.number(),
    incoming: z.boolean(),
    support_email: z.string().nullable().optional(),
    to_emails: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string(),
    attachments: z.array(z.unknown()).optional(),
    structured_body: z.unknown().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created conversation (note).'),
        ticket_id: z.number().describe('ID of the ticket this note belongs to.'),
        body: z.string().describe('Note content in HTML.'),
        body_text: z.string().describe('Note content as plain text.'),
        private: z.boolean().describe('Whether the note is private.'),
        user_id: z.number().describe('ID of the agent who created the note.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the note was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the note was last updated.')
    })
    .describe('Output of a note added to a Freshdesk ticket.');

/**
 * @tags: [write]
 * @tagReason: Creates a new note on a Freshdesk ticket.
 * @pitfalls: For webchat or mobile SDK tickets, structured_body is required instead of body for public notes.
 */
const action = createAction({
    description: 'Add a private or public note to a Freshdesk ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#add_note_to_a_ticket
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.ticket_id))}/notes`,
            data: {
                body: input.body,
                // Freshdesk defaults an omitted `private` to true, despite this action documenting
                // a public default; send the desired default explicitly.
                private: input.private ?? false
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerNote = ProviderConversationSchema.parse(response.data);

        return {
            id: providerNote.id,
            ticket_id: providerNote.ticket_id,
            body: providerNote.body,
            body_text: providerNote.body_text,
            private: providerNote.private,
            user_id: providerNote.user_id,
            created_at: providerNote.created_at,
            updated_at: providerNote.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
