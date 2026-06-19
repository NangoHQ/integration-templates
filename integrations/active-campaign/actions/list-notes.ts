import { z } from 'zod';
import { createAction } from 'nango';

const CursorSchema = z.object({
    offset: z.number()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.'),
    search: z.string().optional().describe('Search term to filter notes.')
});

const NoteSchema = z.object({
    id: z.string(),
    note: z.string(),
    relid: z.string(),
    reltype: z.string(),
    userid: z.string(),
    user: z.string(),
    is_draft: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    owner: z
        .object({
            type: z.string(),
            id: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(NoteSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    notes: z.array(z.unknown()).default([]),
    meta: z
        .object({
            total: z.union([z.string(), z.number()]).optional()
        })
        .optional()
});

const action = createAction({
    description: 'List notes from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        let offset = 0;

        if (input.cursor) {
            // @allowTryCatch: converting cursor parsing failures into a clear, user-friendly ActionError
            try {
                const decoded = Buffer.from(input.cursor, 'base64').toString('utf-8');
                const parsed: unknown = JSON.parse(decoded);
                const result = CursorSchema.safeParse(parsed);
                if (!result.success) {
                    throw new nango.ActionError({
                        type: 'invalid_cursor',
                        message: 'Invalid pagination cursor.'
                    });
                }
                offset = result.data.offset;
            } catch (_error) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid pagination cursor.'
                });
            }
        }

        // https://developers.activecampaign.com/reference/retrieve-list-of-all-notes
        const response = await nango.get({
            endpoint: '/3/notes',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.notes.map((item: unknown) => {
            const note = NoteSchema.parse(item);
            return {
                id: note.id,
                note: note.note,
                relid: note.relid,
                reltype: note.reltype,
                userid: note.userid,
                user: note.user,
                is_draft: note.is_draft,
                ...(note.cdate !== undefined && { cdate: note.cdate }),
                ...(note.mdate !== undefined && { mdate: note.mdate }),
                ...(note.owner !== undefined && { owner: note.owner })
            };
        });

        const total = Number(parsed.meta?.total ?? '0');
        const nextOffset = offset + limit;
        const nextCursor = nextOffset < total ? Buffer.from(JSON.stringify({ offset: nextOffset })).toString('base64') : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
