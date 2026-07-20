import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    body: z.string().describe('Note body text. Example: "Follow-up call scheduled"'),
    title: z.string().optional().describe('Note title. Example: "Follow-up summary"'),
    color: z.string().optional().describe('Hex color code. Example: "#FFAA00"'),
    pinned: z.boolean().optional().describe('Whether the note is pinned.'),
    userId: z.string().optional().describe('User ID to associate with the note.')
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    body: z.string(),
    userId: z.string().nullable().optional(),
    dateAdded: z.string().nullable().optional(),
    contactId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    pinned: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    note: ProviderNoteSchema
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    userId: z.string().optional(),
    dateAdded: z.string().optional(),
    contactId: z.string().optional(),
    title: z.string().optional(),
    color: z.string().optional(),
    pinned: z.boolean().optional()
});

const action = createAction({
    description: 'Add a note to a contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/844eb3506d86a-create-note
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/notes`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                body: input.body,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.pinned !== undefined && { pinned: input.pinned }),
                ...(input.userId !== undefined && { userId: input.userId })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const note = providerResponse.note;

        return {
            id: note.id,
            body: note.body,
            ...(note.userId != null && { userId: note.userId }),
            ...(note.dateAdded != null && { dateAdded: note.dateAdded }),
            ...(note.contactId != null && { contactId: note.contactId }),
            ...(note.title != null && { title: note.title }),
            ...(note.color != null && { color: note.color }),
            ...(note.pinned != null && { pinned: note.pinned })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
