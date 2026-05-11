import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The unique identifier of the contact to add the note to. Example: "6762f0ad1bb69f9f2193bb62"'),
    body: z.string().describe('The text content of the note. Example: "This is an internal note about the contact"'),
    admin_id: z
        .string()
        .optional()
        .describe('The unique identifier of the admin creating the note. If omitted, the note is created by the authorized admin. Example: "123"')
});

const ContactReferenceSchema = z.object({
    type: z.string(),
    id: z.string()
});

const AuthorSchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    away_mode_enabled: z.boolean().optional(),
    away_mode_reassign: z.boolean().optional()
});

const ProviderNoteSchema = z.object({
    type: z.string(),
    id: z.string(),
    created_at: z.number(),
    contact: ContactReferenceSchema.nullable(),
    author: AuthorSchema.nullable(),
    body: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    created_at: z.number(),
    body: z.string(),
    contact_id: z.string().optional(),
    admin_id: z.string().optional(),
    admin_name: z.string().optional(),
    admin_email: z.string().optional()
});

const action = createAction({
    description: 'Add an internal note to a contact',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/notes/createnote
        const response = await nango.post({
            endpoint: `/contacts/${encodeURIComponent(input.contact_id)}/notes`,
            data: {
                body: input.body,
                ...(input.admin_id !== undefined && { admin_id: input.admin_id })
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        const providerNote = ProviderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            type: providerNote.type,
            created_at: providerNote.created_at,
            body: providerNote.body,
            ...(providerNote.contact?.id && { contact_id: providerNote.contact.id }),
            ...(providerNote.author?.id && { admin_id: providerNote.author.id }),
            ...(providerNote.author?.name && { admin_name: providerNote.author.name }),
            ...(providerNote.author?.email && { admin_email: providerNote.author.email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
