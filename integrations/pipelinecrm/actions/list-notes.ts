import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_id: z.number().optional().describe('Filter by associated deal ID. Example: 55383278'),
    person_id: z.number().optional().describe('Filter by associated person ID. Example: 1309859837'),
    company_id: z.number().optional().describe('Filter by associated company ID. Example: 138551860'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(200).optional().describe('Number of items per page. Max 200.')
});

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    url: z.string().optional()
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    title: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    user_id: z.number().nullable().optional(),
    deal_id: z.number().nullable().optional(),
    person_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    note_category_id: z.number().nullable().optional(),
    note_category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .nullable()
        .optional(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            avatar_thumb_url: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const NoteOutputSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    content: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    company_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    note_category_id: z.number().optional(),
    note_category: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            avatar_thumb_url: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(NoteOutputSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    entries: z.array(ProviderNoteSchema),
    pagination: PaginationSchema
});

const action = createAction({
    description: 'List notes (activities) scoped to a deal, person, company, or across the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number string'
            });
        }

        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.get({
            endpoint: '/api/v3/notes.json',
            params: {
                ...(input.deal_id !== undefined && { deal_id: String(input.deal_id) }),
                ...(input.person_id !== undefined && { person_id: String(input.person_id) }),
                ...(input.company_id !== undefined && { company_id: String(input.company_id) }),
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.entries.map((note) => ({
            id: note.id,
            ...(note.title != null && { title: note.title }),
            ...(note.content != null && { content: note.content }),
            ...(note.user_id != null && { user_id: note.user_id }),
            ...(note.deal_id != null && { deal_id: note.deal_id }),
            ...(note.person_id != null && { person_id: note.person_id }),
            ...(note.company_id != null && { company_id: note.company_id }),
            ...(note.created_at != null && { created_at: note.created_at }),
            ...(note.updated_at != null && { updated_at: note.updated_at }),
            ...(note.note_category_id != null && { note_category_id: note.note_category_id }),
            ...(note.note_category != null && { note_category: note.note_category }),
            ...(note.user != null && {
                user: {
                    id: note.user.id,
                    ...(note.user.first_name != null && { first_name: note.user.first_name }),
                    ...(note.user.last_name != null && { last_name: note.user.last_name }),
                    ...(note.user.avatar_thumb_url != null && { avatar_thumb_url: note.user.avatar_thumb_url })
                }
            })
        }));

        const { pagination } = listResponse;
        const hasMore = pagination.page * pagination.per_page < pagination.total;
        const next_cursor = hasMore ? String(pagination.page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
