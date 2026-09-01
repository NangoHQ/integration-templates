import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        created_before: z.string().optional().describe('Return notes created before this date. Accepts ISO 8601 date or date-time strings.'),
        created_after: z.string().optional().describe('Return notes created after this date. Accepts ISO 8601 date or date-time strings.'),
        updated_after: z
            .string()
            .optional()
            .describe(
                'Return notes updated after this date. Accepts ISO 8601 date or date-time strings. This filter is precise and will return an empty list if no notes match.'
            ),
        folder_id: z
            .string()
            .regex(/^fol_[a-zA-Z0-9]{14}$/)
            .optional()
            .describe('Return notes in this folder and any of its child folders. Use the list folders endpoint to discover folder IDs.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        page_size: z.number().min(1).max(30).optional().describe('Maximum number of notes to return per page. Defaults to 10, capped at 30.')
    })
    .describe('Input for listing Granola meeting notes.');

const ProviderUserSchema = z.object({
    name: z.string().nullable(),
    email: z.string()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    object: z.literal('note'),
    title: z.string().nullable(),
    owner: ProviderUserSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderListOutputSchema = z.object({
    notes: z.array(ProviderNoteSchema),
    hasMore: z.boolean(),
    cursor: z.string().nullable()
});

const NoteSchema = z.object({
    id: z.string().describe('The ID of the note.'),
    object: z.literal('note').describe('The object type of the note.'),
    title: z.string().optional().describe('The title of the note, if present.'),
    owner: z
        .object({
            name: z.string().optional().describe('The name of the note owner, if known.'),
            email: z.string().describe('The email of the note owner.')
        })
        .describe('The owner of the note.'),
    created_at: z.string().describe('The creation time of the note in ISO 8601 format.'),
    updated_at: z.string().describe('The last update time of the note in ISO 8601 format.')
});

const OutputSchema = z
    .object({
        notes: z.array(NoteSchema).describe('The list of notes visible to the API key.'),
        hasMore: z.boolean().describe('Whether another page of notes is available.'),
        next_cursor: z.string().optional().describe('The opaque cursor for the next page, or omitted when this is the final page.')
    })
    .describe('Output from listing Granola meeting notes.');

/**
 * @tags: [read]
 * @tagReason: Lists meeting notes visible to the API key. This is a read-only provider operation.
 * @pitfalls: Returned notes are lightweight summaries that omit summaries, transcripts, attendees, and folder membership; use get-note for full details. folder_id filters recursively to the specified folder and all descendants. updated_after returns an empty list when no notes match.
 */
const action = createAction({
    description: 'List meeting notes visible to the API key, with date and folder filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.granola.ai/api-reference/list-notes.md
            endpoint: '/v1/notes',
            params: {
                ...(input.created_before !== undefined && { created_before: input.created_before }),
                ...(input.created_after !== undefined && { created_after: input.created_after }),
                ...(input.updated_after !== undefined && { updated_after: input.updated_after }),
                ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const providerResponse = ProviderListOutputSchema.parse(response.data);

        return {
            notes: providerResponse.notes.map((note) => ({
                id: note.id,
                object: note.object,
                ...(note.title != null && { title: note.title }),
                owner: {
                    ...(note.owner.name != null && { name: note.owner.name }),
                    email: note.owner.email
                },
                created_at: note.created_at,
                updated_at: note.updated_at
            })),
            hasMore: providerResponse.hasMore,
            ...(providerResponse.cursor != null && { next_cursor: providerResponse.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
