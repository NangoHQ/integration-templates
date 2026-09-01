import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        note_id: z.string().describe('The ID of the note to retrieve. Example: not_1d3tmYTlCICgjy'),
        include_transcript: z
            .boolean()
            .optional()
            .describe('Whether to include the transcript inline in the response. If the transcript is too large, the API returns a 413 error.')
    })
    .describe('Input for retrieving a single Granola meeting note.');

const UserSchema = z.object({
    name: z.string().nullable().describe('The name of the user, or null if not set.'),
    email: z.string().describe('The email of the user.')
});

const CalendarInviteeSchema = z.object({
    email: z.string().describe('The email of the calendar invitee.')
});

const CalendarEventSchema = z.object({
    event_title: z.string().nullable().describe('The title of the calendar event, or null if not available.'),
    invitees: z.array(CalendarInviteeSchema).describe('The invitees of the calendar event.'),
    organiser: z.string().nullable().describe('The email of the organiser, or null if not available.'),
    calendar_event_id: z.string().nullable().describe('The ID of the calendar event, or null if not available.'),
    scheduled_start_time: z.string().nullable().describe('The scheduled start time of the calendar event, or null if not available.'),
    scheduled_end_time: z.string().nullable().describe('The scheduled end time of the calendar event, or null if not available.')
});

const FolderSchema = z.object({
    id: z.string().describe('The ID of the folder.'),
    object: z.string().describe('The object type of the folder.'),
    name: z.string().describe('The name of the folder.'),
    parent_folder_id: z.string().nullable().describe('The ID of the parent folder, or null if the folder is top-level.')
});

const SpeakerSchema = z.object({
    source: z.string().describe('The source of the speaker.'),
    attribution: z.string().optional().describe('Who said this relative to the note owner.'),
    diarization_label: z.string().optional().describe('The diarized anonymous speaker label assigned in the transcript.'),
    name: z.string().optional().describe('The resolved name of the identified speaker.')
});

const TranscriptSchema = z.object({
    speaker: SpeakerSchema.describe('The speaker information for this transcript segment.'),
    text: z.string().describe('The text of the transcript segment.'),
    start_time: z.string().describe('The start time of the transcript segment.'),
    end_time: z.string().describe('The end time of the transcript segment.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the note.'),
        object: z.string().describe('The object type of the note.'),
        title: z.string().nullable().describe('The title of the note, or null if not set.'),
        owner: UserSchema.describe('The owner of the note.'),
        created_at: z.string().describe('The creation time of the note.'),
        updated_at: z.string().describe('The last update time of the note.'),
        web_url: z.string().describe('The URL to view the note in the Granola web app.'),
        calendar_event: CalendarEventSchema.nullable().describe('The calendar event associated with the note, or null if not available.'),
        attendees: z.array(UserSchema).describe('The attendees of the meeting.'),
        folder_membership: z.array(FolderSchema).describe('The folders this note belongs to.'),
        summary_text: z.string().describe('The summary text of the note.'),
        summary_markdown: z.string().nullable().describe('The summary of the note in markdown format, or null if not available.'),
        private_notes_text: z.string().nullable().describe('The private notes text of the note owner, or null if the API key does not belong to the owner.'),
        private_notes_markdown: z
            .string()
            .nullable()
            .describe('The private notes markdown of the note owner, or null if the API key does not belong to the owner.'),
        transcript: z.array(TranscriptSchema).nullable().describe('The inline transcript of the note, or null if not included or too large to return.')
    })
    .describe('A Granola meeting note.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single meeting note from the Granola API.
 * @pitfalls: When include_transcript is true and the transcript is too large, the action throws an error instead of returning a note with a null transcript; use the get-transcript action to retrieve large transcripts.
 */
const action = createAction({
    description: 'Retrieve a single meeting note, optionally with its transcript inlined.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.granola.ai/api-reference/get-note.md
        const response = await nango.get({
            endpoint: `/v1/notes/${encodeURIComponent(input.note_id)}`,
            params: {
                ...(input.include_transcript && { include: 'transcript' })
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                note_id: input.note_id
            });
        }

        if (response.status === 413) {
            throw new nango.ActionError({
                type: 'transcript_too_large',
                message: 'The transcript is too large to return inline. Use the get-transcript action to retrieve it in pages.',
                note_id: input.note_id
            });
        }

        const note = OutputSchema.parse(response.data);
        return note;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
