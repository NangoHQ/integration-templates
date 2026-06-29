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

const sync = createSync({
    description: 'Full-refresh sync of all transcript sentences, fetched per transcript.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Sentence: SentenceSchema
    },
    endpoints: [
        {
            path: '/syncs/transcript-sentences',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Blocker: no per-sentence changed feed exists; sentences are embedded inside transcript objects only.
        await nango.trackDeletesStart('Sentence');

        const limit = 50;
        let skip = 0;
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

            for (const transcript of transcripts) {
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
            }

            if (transcripts.length < limit) {
                hasMore = false;
            } else {
                skip += limit;
            }
        }

        await nango.trackDeletesEnd('Sentence');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
