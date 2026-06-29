import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe('Gong call ID. Example: "7782342274025937895"')
});

const SentenceSchema = z.object({
    start: z.number().nullable(),
    end: z.number().nullable(),
    text: z.string().nullable()
});

const MonologueSchema = z.object({
    speakerId: z.string().nullable(),
    topic: z.string().nullish(),
    sentences: z.array(SentenceSchema).nullable()
});

const CallTranscriptSchema = z.object({
    callId: z.string(),
    transcript: z.array(MonologueSchema).nullable()
});

const OutputSchema = z.object({
    callId: z.string().nullable(),
    transcript: z.array(MonologueSchema).nullable()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    records: z
        .object({
            totalRecords: z.number().nullable(),
            currentPageSize: z.number().nullable(),
            currentPageNumber: z.number().nullish(),
            cursor: z.string().nullish()
        })
        .nullish(),
    callTranscripts: z.array(CallTranscriptSchema).nullish()
});

const ErrorResponseSchema = z.object({
    requestId: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number(),
            data: z.unknown()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve the transcript for a single Gong call.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:read:transcript'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://help.gong.io/apidocs/retrieve-transcripts-of-calls-by-date-or-callids-v2callstranscript-2
            endpoint: '/v2/calls/transcript',
            data: {
                filter: {
                    callIds: [input.callId]
                }
            },
            retries: 3
        };

        // @allowTryCatch: Nango throws on HTTP error status codes (e.g. 404), so we catch to normalize the 404 into an empty result.
        try {
            const response = await nango.post(config);

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const callTranscripts = providerResponse.callTranscripts;

            if (!callTranscripts || callTranscripts.length === 0) {
                return {
                    callId: input.callId,
                    transcript: []
                };
            }

            const callTranscript = callTranscripts[0];
            if (!callTranscript) {
                return {
                    callId: input.callId,
                    transcript: []
                };
            }

            return {
                callId: callTranscript.callId,
                transcript: callTranscript.transcript
            };
        } catch (error) {
            const axiosError = AxiosErrorSchema.safeParse(error);
            if (axiosError.success && axiosError.data.response) {
                const status = axiosError.data.response.status;
                const responseData = z.unknown().parse(axiosError.data.response.data);
                if (status === 404) {
                    const errorBody = ErrorResponseSchema.safeParse(responseData);
                    if (errorBody.success && errorBody.data.errors?.some((e) => e.includes('No calls found'))) {
                        return {
                            callId: input.callId,
                            transcript: []
                        };
                    }
                    const errMsg = errorBody.success && errorBody.data.errors?.length ? errorBody.data.errors.join(', ') : 'Call not found';
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: errMsg,
                        callId: input.callId
                    });
                }
                const errorBody = ErrorResponseSchema.safeParse(responseData);
                const errors = errorBody.success && errorBody.data.errors ? errorBody.data.errors : ['Unexpected error from Gong API'];
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: errors.join(', '),
                    callId: input.callId,
                    status
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
