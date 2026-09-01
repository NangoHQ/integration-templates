import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        note_id: z.string().describe('Unique identifier of the note whose transcript to retrieve. Example: "not_IBuThyr2eJgage"'),
        cursor: z.string().optional().describe('Opaque pagination cursor from a previous response. Omit for the first page.'),
        page_size: z.number().min(1).max(100).optional().describe('Number of transcript segments per page. Maximum 100, default 50.')
    })
    .describe('Input for retrieving a paginated meeting transcript.');

const SpeakerSchema = z
    .object({
        source: z.string().describe('Source of the speaker attribution, such as "microphone" or "speaker".'),
        attribution: z
            .string()
            .optional()
            .describe('Who said this relative to the note: "me" is the note-taker, "them" is other participants. Omitted when unknown.'),
        diarization_label: z
            .string()
            .optional()
            .describe('Diarized anonymous speaker label, such as "Speaker A". Present only on iOS transcripts when diarization is available.'),
        name: z.string().optional().describe('Resolved name of the identified speaker, such as "Alice Smith". Present only when a speaker could be identified.')
    })
    .describe('Speaker information for a transcript segment.');

const TranscriptSegmentSchema = z
    .object({
        text: z.string().describe('Spoken text of the segment.'),
        start_time: z.string().describe('ISO 8601 start time of the segment.'),
        end_time: z.string().describe('ISO 8601 end time of the segment.'),
        speaker: SpeakerSchema.describe('Speaker information for this segment.')
    })
    .describe('A single segment of a meeting transcript.');

const OutputSchema = z
    .object({
        transcript: z.array(TranscriptSegmentSchema).describe('Array of transcript segments for the requested page.'),
        hasMore: z.boolean().describe('Whether additional pages of transcript segments exist.'),
        cursor: z.string().optional().describe('Opaque cursor to request the next page. Omitted when hasMore is false.')
    })
    .describe('Output containing a page of transcript segments and pagination state.');

/**
 * @tags: [read]
 * @tagReason: Retrieves paginated transcript segments from a meeting note.
 * @pitfalls: On iOS transcripts, speaker attribution may be omitted and diarization_label can appear instead when diarization is available.
 */
const action = createAction({
    description: "Retrieve a meeting transcript in pages - use when get-note's inline transcript is too large, or to page through a transcript directly.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { cursor?: string; page_size?: string } = {};
        if (input.cursor !== undefined) {
            params.cursor = input.cursor;
        }
        if (input.page_size !== undefined) {
            params.page_size = String(input.page_size);
        }

        // https://docs.granola.ai/api-reference/get-transcript.md
        const response = await nango.get({
            endpoint: `/v1/notes/${encodeURIComponent(input.note_id)}/transcript`,
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            transcript: z.array(
                z.object({
                    text: z.string(),
                    start_time: z.string(),
                    end_time: z.string(),
                    speaker: z.object({
                        source: z.string(),
                        attribution: z.string().optional(),
                        diarization_label: z.string().optional(),
                        name: z.string().optional()
                    })
                })
            ),
            hasMore: z.boolean(),
            cursor: z.string().nullable()
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            transcript: providerData.transcript.map((segment) => ({
                text: segment.text,
                start_time: segment.start_time,
                end_time: segment.end_time,
                speaker: {
                    source: segment.speaker.source,
                    ...(segment.speaker.attribution !== undefined && { attribution: segment.speaker.attribution }),
                    ...(segment.speaker.diarization_label !== undefined && { diarization_label: segment.speaker.diarization_label }),
                    ...(segment.speaker.name !== undefined && { name: segment.speaker.name })
                }
            })),
            hasMore: providerData.hasMore,
            ...(providerData.cursor != null && { cursor: providerData.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
