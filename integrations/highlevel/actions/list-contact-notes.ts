import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"')
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    body: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    dateAdded: z.string().nullable().optional(),
    contactId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    pinned: z.boolean().nullable().optional()
});

const NoteOutputSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    userId: z.string().optional(),
    dateAdded: z.string().optional(),
    contactId: z.string().optional(),
    title: z.string().optional(),
    color: z.string().optional(),
    pinned: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(NoteOutputSchema)
});

const action = createAction({
    description: 'List notes on a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/0440e3877c75f-get-all-notes
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/notes`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                notes: z.array(ProviderNoteSchema)
            })
            .parse(response.data);

        return {
            items: providerResponse.notes.map((note) => ({
                id: note.id,
                ...(note.body != null && { body: note.body }),
                ...(note.userId != null && { userId: note.userId }),
                ...(note.dateAdded != null && { dateAdded: note.dateAdded }),
                ...(note.contactId != null && { contactId: note.contactId }),
                ...(note.title != null && { title: note.title }),
                ...(note.color != null && { color: note.color }),
                ...(note.pinned != null && { pinned: note.pinned })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
