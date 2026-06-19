import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(50).optional().describe('The maximum number of results to return. Default is 10, maximum is 50.'),
    parent_object: z.string().optional().describe('The slug or ID of the parent object the notes belong to.'),
    parent_record_id: z.string().uuid().optional().describe('The ID of the parent record the notes belong to.')
});

const TagSchema = z.union([
    z.object({
        type: z.literal('workspace-member'),
        workspace_member_id: z.string().uuid()
    }),
    z.object({
        type: z.literal('record'),
        object: z.string(),
        record_id: z.string().uuid()
    })
]);

const ProviderNoteSchema = z.object({
    id: z.object({
        workspace_id: z.string().uuid(),
        note_id: z.string().uuid()
    }),
    parent_object: z.string(),
    parent_record_id: z.string().uuid(),
    title: z.string(),
    meeting_id: z.string().uuid().nullable(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(TagSchema),
    created_by_actor: z.object({
        id: z.string().nullable().optional(),
        type: z.string().nullable().optional()
    }),
    created_at: z.string()
});

const NoteSchema = z.object({
    workspace_id: z.string().uuid(),
    note_id: z.string().uuid(),
    parent_object: z.string(),
    parent_record_id: z.string().uuid(),
    title: z.string(),
    meeting_id: z.string().uuid().optional(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(TagSchema),
    created_by_actor: z.object({
        id: z.string().optional(),
        type: z.string().optional()
    }),
    created_at: z.string()
});

const ListOutputSchema = z.object({
    items: z.array(NoteSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List notes from Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['note:read', 'object_configuration:read', 'record_permission:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const parsedOffset = input.cursor ? parseInt(input.cursor, 10) : 0;
        const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
        const limit = input.limit ?? 10;

        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/notes/list-notes
            endpoint: '/v2/notes',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.parent_object !== undefined && { parent_object: input.parent_object }),
                ...(input.parent_record_id !== undefined && { parent_record_id: input.parent_record_id })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData) || !('data' in rawData) || !Array.isArray(rawData.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Attio API.'
            });
        }

        const providerData = z.object({ data: z.array(z.unknown()) }).parse(rawData);
        const notes = providerData.data.map((item) => {
            const note = ProviderNoteSchema.parse(item);
            return {
                workspace_id: note.id.workspace_id,
                note_id: note.id.note_id,
                parent_object: note.parent_object,
                parent_record_id: note.parent_record_id,
                title: note.title,
                ...(note.meeting_id != null && { meeting_id: note.meeting_id }),
                content_plaintext: note.content_plaintext,
                content_markdown: note.content_markdown,
                tags: note.tags,
                created_by_actor: {
                    ...(note.created_by_actor.id != null && { id: note.created_by_actor.id }),
                    ...(note.created_by_actor.type != null && { type: note.created_by_actor.type })
                },
                created_at: note.created_at
            };
        });

        const nextCursor = notes.length === limit ? String(offset + limit) : undefined;

        return {
            items: notes,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
