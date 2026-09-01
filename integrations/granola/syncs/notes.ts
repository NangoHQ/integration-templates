import { createSync } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    name: z.string().nullable(),
    email: z.string()
});

const ProviderNoteSummarySchema = z.object({
    id: z.string(),
    object: z.literal('note'),
    title: z.string().nullable(),
    owner: ProviderUserSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderCalendarEventSchema = z.object({
    event_title: z.string().nullable(),
    invitees: z.array(
        z.object({
            email: z.string()
        })
    ),
    organiser: z.string().nullable(),
    calendar_event_id: z.string().nullable(),
    scheduled_start_time: z.string().nullable(),
    scheduled_end_time: z.string().nullable()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    object: z.literal('folder'),
    name: z.string(),
    parent_folder_id: z.string().nullable()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    object: z.literal('note'),
    title: z.string().nullable(),
    owner: ProviderUserSchema,
    created_at: z.string(),
    updated_at: z.string(),
    web_url: z.string(),
    calendar_event: ProviderCalendarEventSchema.nullable(),
    attendees: z.array(ProviderUserSchema),
    folder_membership: z.array(ProviderFolderSchema),
    summary_text: z.string(),
    summary_markdown: z.string().nullable(),
    private_notes_text: z.string().nullable(),
    private_notes_markdown: z.string().nullable(),
    transcript: z.array(z.unknown()).nullable()
});

const CalendarEventSchema = z
    .object({
        event_title: z.string().optional().describe('The title of the calendar event'),
        invitees: z
            .array(
                z
                    .object({
                        email: z.string().describe('The email of the calendar invitee')
                    })
                    .describe('A calendar invitee')
            )
            .describe('The invitees of the calendar event'),
        organiser: z.string().optional().describe('The email of the organiser'),
        calendar_event_id: z.string().optional().describe('The ID of the calendar event'),
        scheduled_start_time: z.string().optional().describe('The scheduled start time of the calendar event'),
        scheduled_end_time: z.string().optional().describe('The scheduled end time of the calendar event')
    })
    .describe('Calendar event associated with the note');

const UserSchema = z
    .object({
        name: z.string().optional().describe('The name of the user'),
        email: z.string().describe('The email of the user')
    })
    .describe('A user');

const FolderSchema = z
    .object({
        id: z.string().describe('The ID of the folder'),
        object: z.string().describe('The object type of the folder'),
        name: z.string().describe('The name of the folder'),
        parent_folder_id: z.string().optional().describe('The ID of the parent folder, or omitted if top-level')
    })
    .describe('A folder');

const NoteSchema = z
    .object({
        id: z.string().describe('The unique ID of the note'),
        object: z.string().describe('The object type of the note'),
        title: z.string().optional().describe('The title of the note'),
        owner: UserSchema.describe('The owner of the note'),
        created_at: z.string().describe('The creation time of the note'),
        updated_at: z.string().describe('The last update time of the note'),
        web_url: z.string().describe('The URL to view the note in the Granola web app'),
        calendar_event: CalendarEventSchema.optional().describe('Calendar event associated with the note'),
        attendees: z.array(UserSchema).describe('The attendees of the meeting'),
        folder_membership: z.array(FolderSchema).describe('The folders the note belongs to'),
        summary_text: z.string().describe('The summary text of the note'),
        summary_markdown: z.string().optional().describe('The summary of the note in markdown format'),
        private_notes_text: z.string().optional().describe('The private notes text of the note owner'),
        private_notes_markdown: z.string().optional().describe('The private notes markdown of the note owner')
    })
    .describe('A Granola meeting note');

const LegacyCheckpointSchema = z.object({
    updated_after: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string(),
    max_updated_at: z.string()
});

const sync = createSync({
    description: 'Sync meeting notes (metadata, summary, attendees, folder/space membership - not the transcript)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let requestUpdatedAfter: string | undefined;
        let cursor: string | undefined;
        let maxUpdatedAt: string | undefined;

        if (rawCheckpoint !== undefined && rawCheckpoint !== null) {
            const parsedCheckpoint = z.union([CheckpointSchema, LegacyCheckpointSchema]).safeParse(rawCheckpoint);

            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }

            requestUpdatedAfter = parsedCheckpoint.data.updated_after || undefined;
            cursor = 'cursor' in parsedCheckpoint.data ? parsedCheckpoint.data.cursor || undefined : undefined;
            maxUpdatedAt = 'max_updated_at' in parsedCheckpoint.data ? parsedCheckpoint.data.max_updated_at || requestUpdatedAfter : requestUpdatedAfter;
        }

        for await (const summaries of nango.paginate({
            // https://docs.granola.ai/api-reference/list-notes.md
            endpoint: '/v1/notes',
            params: {
                ...(requestUpdatedAfter !== undefined && { updated_after: requestUpdatedAfter }),
                ...(cursor !== undefined && { cursor }),
                page_size: 30
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'notes',
                limit_name_in_request: 'page_size',
                limit: 30,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const parsedSummaries = z.array(ProviderNoteSummarySchema).parse(summaries);
            const notes = [];

            for (const summary of parsedSummaries) {
                const noteId = summary.id;

                // https://docs.granola.ai/api-reference/get-note.md
                const noteResponse = await nango.get({
                    endpoint: `/v1/notes/${encodeURIComponent(noteId)}`,
                    retries: 3
                });

                const parsedNote = ProviderNoteSchema.safeParse(noteResponse.data);

                if (!parsedNote.success) {
                    throw new Error(`Invalid note detail: ${parsedNote.error.message}`);
                }

                const note = parsedNote.data;

                notes.push({
                    id: note.id,
                    object: note.object,
                    ...(note.title != null && { title: note.title }),
                    owner: {
                        ...(note.owner.name != null && { name: note.owner.name }),
                        email: note.owner.email
                    },
                    created_at: note.created_at,
                    updated_at: note.updated_at,
                    web_url: note.web_url,
                    ...(note.calendar_event != null && {
                        calendar_event: {
                            ...(note.calendar_event.event_title != null && { event_title: note.calendar_event.event_title }),
                            invitees: note.calendar_event.invitees.map((invitee) => ({ email: invitee.email })),
                            ...(note.calendar_event.organiser != null && { organiser: note.calendar_event.organiser }),
                            ...(note.calendar_event.calendar_event_id != null && { calendar_event_id: note.calendar_event.calendar_event_id }),
                            ...(note.calendar_event.scheduled_start_time != null && { scheduled_start_time: note.calendar_event.scheduled_start_time }),
                            ...(note.calendar_event.scheduled_end_time != null && { scheduled_end_time: note.calendar_event.scheduled_end_time })
                        }
                    }),
                    attendees: note.attendees.map((attendee) => ({
                        ...(attendee.name != null && { name: attendee.name }),
                        email: attendee.email
                    })),
                    folder_membership: note.folder_membership.map((folder) => ({
                        id: folder.id,
                        object: folder.object,
                        name: folder.name,
                        ...(folder.parent_folder_id != null && { parent_folder_id: folder.parent_folder_id })
                    })),
                    summary_text: note.summary_text,
                    ...(note.summary_markdown != null && { summary_markdown: note.summary_markdown }),
                    ...(note.private_notes_text != null && { private_notes_text: note.private_notes_text }),
                    ...(note.private_notes_markdown != null && { private_notes_markdown: note.private_notes_markdown })
                });

                if (maxUpdatedAt === undefined || note.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = note.updated_at;
                }
            }

            if (notes.length > 0) {
                await nango.batchSave(notes, 'Note');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: requestUpdatedAfter ?? '',
                    cursor,
                    max_updated_at: maxUpdatedAt ?? ''
                });
            } else if (maxUpdatedAt !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: maxUpdatedAt,
                    cursor: '',
                    max_updated_at: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
