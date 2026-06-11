import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recording_sid: z
        .string()
        .describe('The Twilio-provided string that uniquely identifies the Recording resource. Example: "REaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const ProviderEncryptionDetailsSchema = z.object({
    encryption_public_key_sid: z.string().optional(),
    encryption_cek: z.string().optional(),
    encryption_iv: z.string().optional()
});

const ProviderSubresourceUrisSchema = z.record(z.string(), z.string()).optional();

const ProviderRecordingSchema = z.object({
    account_sid: z.string(),
    api_version: z.string().optional(),
    call_sid: z.string().optional(),
    conference_sid: z.string().nullable().optional(),
    channels: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    start_time: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    duration: z.string().nullable().optional(),
    sid: z.string(),
    source: z.string().optional(),
    status: z.string().optional(),
    error_code: z.number().nullable().optional(),
    uri: z.string().optional(),
    subresource_uris: ProviderSubresourceUrisSchema,
    encryption_details: ProviderEncryptionDetailsSchema.nullable().optional(),
    media_url: z.string().nullable().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const OutputSchema = z.object({
    account_sid: z.string(),
    api_version: z.string().optional(),
    call_sid: z.string().optional(),
    conference_sid: z.string().optional(),
    channels: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    start_time: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    duration: z.string().optional(),
    sid: z.string(),
    source: z.string().optional(),
    status: z.string().optional(),
    error_code: z.number().optional(),
    uri: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    encryption_details: z
        .object({
            encryption_public_key_sid: z.string().optional(),
            encryption_cek: z.string().optional(),
            encryption_iv: z.string().optional()
        })
        .optional(),
    media_url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single recording from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-recording',
        group: 'Recordings'
    },
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        let accountSid = metadata.account_sid;

        if (!accountSid) {
            const connection = await nango.getConnection();
            const credentials = connection.credentials;

            if (credentials && 'username' in credentials && typeof credentials.username === 'string') {
                accountSid = credentials.username;
            }
        }

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Missing Twilio Account SID in connection credentials or metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/voice/api/recording#retrieve-a-recordings-metadata
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Recordings/${encodeURIComponent(input.recording_sid)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Recording not found.',
                recording_sid: input.recording_sid
            });
        }

        const providerRecording = ProviderRecordingSchema.parse(response.data);

        return {
            account_sid: providerRecording.account_sid,
            ...(providerRecording.api_version !== undefined && { api_version: providerRecording.api_version }),
            ...(providerRecording.call_sid !== undefined && { call_sid: providerRecording.call_sid }),
            ...(providerRecording.conference_sid != null && { conference_sid: providerRecording.conference_sid }),
            ...(providerRecording.channels !== undefined && { channels: providerRecording.channels }),
            ...(providerRecording.date_created !== undefined && { date_created: providerRecording.date_created }),
            ...(providerRecording.date_updated !== undefined && { date_updated: providerRecording.date_updated }),
            ...(providerRecording.start_time !== undefined && { start_time: providerRecording.start_time }),
            ...(providerRecording.price != null && { price: providerRecording.price }),
            ...(providerRecording.price_unit != null && { price_unit: providerRecording.price_unit }),
            ...(providerRecording.duration != null && { duration: providerRecording.duration }),
            sid: providerRecording.sid,
            ...(providerRecording.source !== undefined && { source: providerRecording.source }),
            ...(providerRecording.status !== undefined && { status: providerRecording.status }),
            ...(providerRecording.error_code != null && { error_code: providerRecording.error_code }),
            ...(providerRecording.uri !== undefined && { uri: providerRecording.uri }),
            ...(providerRecording.subresource_uris !== undefined && { subresource_uris: providerRecording.subresource_uris }),
            ...(providerRecording.encryption_details != null && {
                encryption_details: {
                    ...(providerRecording.encryption_details.encryption_public_key_sid !== undefined && {
                        encryption_public_key_sid: providerRecording.encryption_details.encryption_public_key_sid
                    }),
                    ...(providerRecording.encryption_details.encryption_cek !== undefined && {
                        encryption_cek: providerRecording.encryption_details.encryption_cek
                    }),
                    ...(providerRecording.encryption_details.encryption_iv !== undefined && {
                        encryption_iv: providerRecording.encryption_details.encryption_iv
                    })
                }
            }),
            ...(providerRecording.media_url != null && { media_url: providerRecording.media_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
