import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    callIds: z.array(z.string()).min(1).describe('Array of Gong call IDs to fetch transcripts for. Example: ["123456789"]')
});

const SentenceSchema = z
    .object({
        start: z.number().optional(),
        end: z.number().optional(),
        text: z.string().optional()
    })
    .passthrough();

const TranscriptBlockSchema = z
    .object({
        speakerId: z.string().optional(),
        topic: z.string().optional(),
        sentences: z.array(SentenceSchema).optional()
    })
    .passthrough();

const CallTranscriptSchema = z
    .object({
        callId: z.string().optional(),
        transcript: z.array(TranscriptBlockSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    callIds: z.array(z.string()).describe('The call IDs that were requested'),
    transcripts: z.array(CallTranscriptSchema).describe('Transcript data for the requested calls'),
    totalCalls: z.number().describe('Total number of transcripts returned')
});

const action = createAction({
    description: 'Fetch transcripts for a specific set of Gong calls by call ID',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/fetch-call-transcripts',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/calls/transcript',
            data: {
                filter: {
                    callIds: input.callIds
                }
            },
            retries: 3
        };

        // @allowTryCatch
        // Gong returns HTTP 404 with "No calls found" when the requested callIds
        // do not match any calls. This is a valid empty result rather than a failure,
        // so we intercept it and return an empty list.
        try {
            const response = await nango.post(config);
            const rawData = response.data;
            if (!rawData) {
                return {
                    callIds: input.callIds,
                    transcripts: [],
                    totalCalls: 0
                };
            }

            const rawTranscripts = Array.isArray(rawData.callTranscripts) ? rawData.callTranscripts : [];
            const parsed = z.array(CallTranscriptSchema).safeParse(rawTranscripts);
            const transcripts = parsed.success ? parsed.data : [];

            return {
                callIds: input.callIds,
                transcripts,
                totalCalls: transcripts.length
            };
        } catch (error: unknown) {
            const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
            if (status === 404) {
                return {
                    callIds: input.callIds,
                    transcripts: [],
                    totalCalls: 0
                };
            }
            throw error;
        }
    }
});

export default action;
