import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_sid: z.string().describe('Twilio Account SID. Example: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    transcription_sid: z.string().describe('Transcription SID. Example: "TRXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"')
});

const ProviderTranscriptionSchema = z.object({
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    recording_sid: z.string().nullable().optional(),
    sid: z.string().optional(),
    status: z.string().optional(),
    transcription_text: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    recording_sid: z.string().optional(),
    sid: z.string().optional(),
    status: z.string().optional(),
    transcription_text: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single transcription from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-transcription',
        group: 'Transcriptions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/voice/api/recording-transcription
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(input.account_sid)}/Transcriptions/${encodeURIComponent(input.transcription_sid)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Transcription not found',
                transcription_sid: input.transcription_sid
            });
        }

        const providerTranscription = ProviderTranscriptionSchema.parse(response.data);

        return {
            account_sid: providerTranscription.account_sid,
            api_version: providerTranscription.api_version,
            date_created: providerTranscription.date_created,
            date_updated: providerTranscription.date_updated,
            duration: providerTranscription.duration,
            ...(providerTranscription.price != null && { price: providerTranscription.price }),
            ...(providerTranscription.price_unit != null && { price_unit: providerTranscription.price_unit }),
            ...(providerTranscription.recording_sid != null && { recording_sid: providerTranscription.recording_sid }),
            sid: providerTranscription.sid,
            status: providerTranscription.status,
            ...(providerTranscription.transcription_text != null && { transcription_text: providerTranscription.transcription_text }),
            ...(providerTranscription.type != null && { type: providerTranscription.type }),
            uri: providerTranscription.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
