import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent_object: z.string().describe('The ID or slug of the parent object the note belongs to. Example: "people"'),
    parent_record_id: z.string().describe('The ID of the parent record the note belongs to. Example: "891dcbfc-9141-415d-9b2a-2238a6cc012d"'),
    title: z.string().describe('The note title. The title is plaintext only and has no formatting.'),
    format: z.enum(['plaintext', 'markdown']).describe('The format of the note content.'),
    content: z.string().describe('The main content of the note, formatted according to the format field.'),
    created_at: z.string().optional().describe('Override the created_at timestamp. Example: "2023-01-01T15:00:00.000000000Z"'),
    meeting_id: z.string().nullable().optional().describe('An optional ID to associate this note with a meeting.')
});

const NoteIdSchema = z.object({
    workspace_id: z.string(),
    note_id: z.string()
});

const NoteTagSchema = z.union([
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

const CreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.enum(['api-token', 'workspace-member', 'system', 'app']).nullable()
});

const ProviderNoteSchema = z.object({
    id: NoteIdSchema,
    parent_object: z.string(),
    parent_record_id: z.string(),
    title: z.string(),
    meeting_id: z.string().nullable(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(NoteTagSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const OutputSchema = z.object({
    id: NoteIdSchema,
    parent_object: z.string(),
    parent_record_id: z.string(),
    title: z.string(),
    meeting_id: z.string().nullable().optional(),
    content_plaintext: z.string(),
    content_markdown: z.string(),
    tags: z.array(NoteTagSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const action = createAction({
    description: 'Create a note in Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['note:read-write', 'object_configuration:read', 'record_permission:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.attio.com/rest-api/endpoint-reference/notes
            endpoint: '/v2/notes',
            data: {
                data: {
                    parent_object: input.parent_object,
                    parent_record_id: input.parent_record_id,
                    title: input.title,
                    format: input.format,
                    content: input.content,
                    ...(input.created_at !== undefined && { created_at: input.created_at }),
                    ...(input.meeting_id !== undefined && { meeting_id: input.meeting_id })
                }
            },
            retries: 3
        });

        const responseBody = z.object({ data: z.unknown() }).parse(response.data);
        const providerNote = ProviderNoteSchema.parse(responseBody.data);

        return {
            id: providerNote.id,
            parent_object: providerNote.parent_object,
            parent_record_id: providerNote.parent_record_id,
            title: providerNote.title,
            ...(providerNote.meeting_id !== null && { meeting_id: providerNote.meeting_id }),
            content_plaintext: providerNote.content_plaintext,
            content_markdown: providerNote.content_markdown,
            tags: providerNote.tags,
            created_by_actor: providerNote.created_by_actor,
            created_at: providerNote.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
