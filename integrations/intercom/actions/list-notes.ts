import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The Intercom contact ID to list notes for. Example: "65f1a2b3c4d5e6f7g8h9i0j1"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (the `next_cursor` value). Omit for the first page.'),
    per_page: z.number().int().min(1).max(150).optional().describe('Number of results per page (max 150). Default varies by API.')
});

const NoteAuthorSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    author: NoteAuthorSchema.optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const ProviderNotesResponseSchema = z.object({
    type: z.string().optional(),
    data: z.array(ProviderNoteSchema).optional(),
    pages: z
        .object({
            type: z.string().optional(),
            next: z
                .object({
                    page: z.number().optional(),
                    starting_after: z.string().optional()
                })
                .optional()
                .nullable(),
            per_page: z.number().optional(),
            total_pages: z.number().optional()
        })
        .optional()
});

const NoteOutputSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    author_id: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const OutputSchema = z.object({
    notes: z.array(NoteOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List internal notes for a contact.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['starting_after'] = input.cursor;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Notes/#list-notes-for-a-contact
        const response = await nango.get({
            endpoint: `/contacts/${encodeURIComponent(input.contact_id)}/notes`,
            params,
            retries: 3
        });

        const validated = ProviderNotesResponseSchema.safeParse(response.data);
        if (!validated.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API response did not match the expected format.',
                details: validated.error.issues
            });
        }

        const data = validated.data;
        const notes = (data.data || []).map((note) => ({
            id: note.id,
            ...(note.body !== undefined && { body: note.body }),
            ...(note.author?.id !== undefined && { author_id: note.author.id }),
            ...(note.author?.name !== undefined && { author_name: note.author.name }),
            ...(note.author?.email !== undefined && { author_email: note.author.email }),
            ...(note.created_at !== undefined && { created_at: note.created_at }),
            ...(note.updated_at !== undefined && { updated_at: note.updated_at })
        }));

        const nextCursor = data.pages?.next?.starting_after;

        return {
            notes,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
