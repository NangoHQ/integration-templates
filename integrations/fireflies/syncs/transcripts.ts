import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TranscriptSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    date: z.string().optional(),
    duration: z.number().optional(),
    organizer_email: z.string().optional(),
    host_email: z.string().optional(),
    participants: z.array(z.string()).optional(),
    privacy: z.string().optional(),
    transcript_url: z.string().optional(),
    audio_url: z.string().optional(),
    video_url: z.string().optional(),
    meeting_link: z.string().optional(),
    calendar_id: z.string().optional(),
    is_live: z.boolean().optional()
});

const CheckpointSchema = z.object({
    fromDate: z.string()
});

const LooseCheckpointSchema = z.object({
    fromDate: z.string().optional()
});

const ProviderTranscriptSchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    dateString: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
    organizer_email: z.string().optional().nullable(),
    host_email: z.string().optional().nullable(),
    participants: z.array(z.string()).optional().nullable(),
    privacy: z.string().optional().nullable(),
    transcript_url: z.string().optional().nullable(),
    audio_url: z.string().optional().nullable(),
    video_url: z.string().optional().nullable(),
    meeting_link: z.string().optional().nullable(),
    calendar_id: z.string().optional().nullable(),
    is_live: z.boolean().optional().nullable()
});

const sync = createSync({
    description: 'Incrementally sync transcript metadata and structured notes using fromDate checkpoint',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transcript: TranscriptSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = LooseCheckpointSchema.safeParse(checkpoint ?? {});
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }
        const fromDate = parsedCheckpoint.data.fromDate;

        let latestDate: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.fireflies.ai/graphql-api/query/transcripts
            endpoint: '/graphql',
            method: 'POST',
            data: {
                query: `query Transcripts($fromDate: DateTime, $limit: Int, $skip: Int) {
                    transcripts(fromDate: $fromDate, limit: $limit, skip: $skip) {
                        id
                        title
                        dateString
                        duration
                        organizer_email
                        host_email
                        participants
                        privacy
                        transcript_url
                        audio_url
                        video_url
                        meeting_link
                        calendar_id
                        is_live
                    }
                }`,
                variables: {
                    ...(fromDate && { fromDate }),
                    limit: 50,
                    skip: 0
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.skip',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 50,
                response_path: 'data.transcripts'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const transcripts: Array<z.infer<typeof TranscriptSchema>> = [];

            for (const item of page) {
                const parsed = ProviderTranscriptSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse transcript: ${parsed.error.message}`);
                }

                const transcript = parsed.data;

                if (transcript.dateString && (latestDate === undefined || transcript.dateString > latestDate)) {
                    latestDate = transcript.dateString;
                }

                transcripts.push({
                    id: transcript.id,
                    ...(transcript.title != null && { title: transcript.title }),
                    ...(transcript.dateString != null && { date: transcript.dateString }),
                    ...(transcript.duration != null && { duration: transcript.duration }),
                    ...(transcript.organizer_email != null && { organizer_email: transcript.organizer_email }),
                    ...(transcript.host_email != null && { host_email: transcript.host_email }),
                    ...(transcript.participants != null && { participants: transcript.participants }),
                    ...(transcript.privacy != null && { privacy: transcript.privacy }),
                    ...(transcript.transcript_url != null && { transcript_url: transcript.transcript_url }),
                    ...(transcript.audio_url != null && { audio_url: transcript.audio_url }),
                    ...(transcript.video_url != null && { video_url: transcript.video_url }),
                    ...(transcript.meeting_link != null && { meeting_link: transcript.meeting_link }),
                    ...(transcript.calendar_id != null && { calendar_id: transcript.calendar_id }),
                    ...(transcript.is_live != null && { is_live: transcript.is_live })
                });
            }

            if (transcripts.length > 0) {
                await nango.batchSave(transcripts, 'Transcript');
            }
        }

        if (latestDate !== undefined) {
            await nango.saveCheckpoint({ fromDate: latestDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
