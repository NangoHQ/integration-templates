import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTagSchema = z.union([
    z.object({
        type: z.literal('workspace-member'),
        workspace_member_id: z.string()
    }),
    z.object({
        type: z.literal('record'),
        object: z.string(),
        record_id: z.string()
    })
]);

const ProviderCreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.string().nullable()
});

const ProviderNoteSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        note_id: z.string()
    }),
    parent_object: z.string(),
    parent_record_id: z.string(),
    title: z.string(),
    meeting_id: z.string().nullable(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(ProviderTagSchema),
    created_by_actor: ProviderCreatedByActorSchema,
    created_at: z.string()
});

const ProviderNotesResponseSchema = z.object({
    data: z.array(ProviderNoteSchema)
});

const NoteSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    parent_object: z.string(),
    parent_record_id: z.string(),
    title: z.string(),
    meeting_id: z.string().optional(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(ProviderTagSchema),
    created_by_actor: z.object({
        id: z.string().optional(),
        type: z.string().optional()
    }),
    created_at: z.string()
});

const CheckpointSchema = z.object({
    offset: z.number().int(),
    in_progress: z.boolean()
});

const sync = createSync({
    description: 'Sync notes from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/notes' }],
    scopes: ['note:read', 'object_configuration:read', 'record_permission:read'],
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = checkpoint?.['offset'] ?? 0;
        const inProgress = checkpoint?.['in_progress'] ?? false;

        if (!inProgress) {
            await nango.trackDeletesStart('Note');
        }

        let hasMore = true;

        while (hasMore) {
            // https://docs.attio.com/rest-api/endpoint-reference/notes/list-notes
            const response = await nango.get({
                endpoint: '/v2/notes',
                params: {
                    limit: 50,
                    offset
                },
                retries: 3
            });

            const parsed = ProviderNotesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid notes response from provider: ${parsed.error.message}`);
            }

            const page = parsed.data.data;
            const notes: Array<z.infer<typeof NoteSchema>> = [];

            for (const note of page) {
                notes.push({
                    id: note.id.note_id,
                    workspace_id: note.id.workspace_id,
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
                });
            }

            if (notes.length > 0) {
                await nango.batchSave(notes, 'Note');
            }

            if (page.length < 50) {
                hasMore = false;
            } else {
                offset += 50;
            }

            await nango.saveCheckpoint({
                offset,
                in_progress: true
            });
        }

        await nango.trackDeletesEnd('Note');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
