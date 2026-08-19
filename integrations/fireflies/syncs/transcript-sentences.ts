import { createSync } from 'nango';
import { z } from 'zod';

const SentenceSchema = z.object({
    id: z.string(),
    transcript_id: z.string(),
    index: z.number(),
    speaker_name: z.string().optional(),
    speaker_id: z.string().optional(),
    raw_text: z.string().optional(),
    text: z.string().optional(),
    start_time: z.number().optional(),
    end_time: z.number().optional()
});

const TranscriptsListResponseSchema = z.object({
    data: z.object({
        transcripts: z
            .array(
                z.object({
                    id: z.string()
                })
            )
            .optional()
    })
});

const TranscriptDetailResponseSchema = z.object({
    data: z.object({
        transcript: z.object({
            id: z.string(),
            sentences: z
                .array(
                    z.object({
                        index: z.number(),
                        speaker_name: z.string().optional().nullable(),
                        speaker_id: z.union([z.string(), z.number()]).optional().nullable(),
                        raw_text: z.string().optional().nullable(),
                        text: z.string().optional().nullable(),
                        start_time: z.union([z.number(), z.string()]).optional().nullable(),
                        end_time: z.union([z.number(), z.string()]).optional().nullable()
                    })
                )
                .optional()
        })
    })
});

const CheckpointSchema = z.object({
    skip: z.number(),
    last_processed_transcript_id: z.string()
});

const LooseCheckpointSchema = z.object({
    skip: z.number().optional(),
    last_processed_transcript_id: z.string().optional()
});

const sync = createSync({
    description: 'Full-refresh sync of all transcript sentences, fetched per transcript.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Sentence: SentenceSchema
    },

    exec: async (nango) => {
        // Blocker: no per-sentence changed feed exists; sentences are embedded inside transcript objects only.
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = LooseCheckpointSchema.safeParse(checkpoint ?? {});
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        await nango.trackDeletesStart('Sentence');

        const limit = 50;
        let skip = parsedCheckpoint.data.skip ?? 0;
        let lastProcessedId = parsedCheckpoint.data.last_processed_transcript_id;
        let hasMore = true;

        while (hasMore) {
            // https://docs.fireflies.ai/graphql-api/query/transcripts
            const listResponse = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: 'query Transcripts($limit: Int!, $skip: Int!) { transcripts(limit: $limit, skip: $skip) { id } }',
                    variables: {
                        limit,
                        skip
                    }
                },
                retries: 3
            });

            const parsedList = TranscriptsListResponseSchema.parse(listResponse.data);
            const transcripts = parsedList.data.transcripts ?? [];

            if (transcripts.length === 0) {
                hasMore = false;
                break;
            }

            let pageTranscripts = transcripts;
            if (lastProcessedId) {
                const resumeIndex = transcripts.findIndex((t) => t.id === lastProcessedId);
                if (resumeIndex !== -1) {
                    pageTranscripts = transcripts.slice(resumeIndex + 1);
                }
                lastProcessedId = undefined;
            }

            for (const transcript of pageTranscripts) {
                // https://docs.fireflies.ai/graphql-api/query/transcript
                const detailResponse = await nango.post({
                    endpoint: '/graphql',
                    data: {
                        query: 'query Transcript($transcriptId: String!) { transcript(id: $transcriptId) { id sentences { index speaker_name speaker_id text raw_text start_time end_time } } }',
                        variables: {
                            transcriptId: transcript.id
                        }
                    },
                    retries: 3
                });

                const parsedDetail = TranscriptDetailResponseSchema.parse(detailResponse.data);
                const transcriptId = parsedDetail.data.transcript.id;
                const sentences = parsedDetail.data.transcript.sentences ?? [];

                const records = sentences.map((sentence) => ({
                    id: `${transcriptId}:${sentence.index}`,
                    transcript_id: transcriptId,
                    index: sentence.index,
                    ...(sentence.speaker_name != null && { speaker_name: sentence.speaker_name }),
                    ...(sentence.speaker_id != null && { speaker_id: String(sentence.speaker_id) }),
                    ...(sentence.raw_text != null && { raw_text: sentence.raw_text }),
                    ...(sentence.text != null && { text: sentence.text }),
                    ...(sentence.start_time != null && isFinite(Number(sentence.start_time)) && { start_time: Number(sentence.start_time) }),
                    ...(sentence.end_time != null && isFinite(Number(sentence.end_time)) && { end_time: Number(sentence.end_time) })
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Sentence');
                }

                await nango.saveCheckpoint({
                    skip,
                    last_processed_transcript_id: transcript.id
                });
            }

            if (transcripts.length < limit) {
                hasMore = false;
            } else {
                skip += limit;
                await nango.saveCheckpoint({
                    skip,
                    last_processed_transcript_id: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Sentence');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
