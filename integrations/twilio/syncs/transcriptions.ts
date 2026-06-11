import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTranscriptionSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().optional(),
    recording_sid: z.string().optional(),
    status: z.string().optional(),
    transcription_text: z.string().nullable().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const TranscriptionSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    recording_sid: z.string().optional(),
    status: z.string().optional(),
    transcription_text: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const CheckpointSchema = z.object({
    date_created_after: z.string(),
    page_token: z.string()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullable().optional()
});

function toDateString(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const sync = createSync({
    description: 'Sync transcriptions from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://www.twilio.com/docs/voice/api/recording-transcription
    endpoints: [{ method: 'GET', path: '/syncs/transcriptions' }],
    models: {
        Transcription: TranscriptionSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        let accountSid: string | undefined;
        if (credentials && credentials.type === 'BASIC') {
            accountSid = credentials.username;
        }
        if (!accountSid) {
            const metadata = await nango.getMetadata();
            const metadataSchema = z.object({
                account_sid: z.string().optional()
            });
            const parsed = metadataSchema.safeParse(metadata);
            if (parsed.success && parsed.data.account_sid) {
                accountSid = parsed.data.account_sid;
            }
        }
        if (!accountSid) {
            throw new Error('Unable to determine Twilio Account SID from credentials or metadata');
        }

        const dateCreatedAfter = checkpoint?.data.date_created_after || undefined;
        let pageToken = checkpoint?.data.page_token || undefined;
        let maxDateCreated: string | undefined;

        const params: Record<string, string | number> = { PageSize: 50 };
        if (dateCreatedAfter) {
            params['DateCreated>'] = dateCreatedAfter;
        }
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/voice/api/recording-transcription
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Transcriptions.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'transcriptions',
                limit_name_in_request: 'PageSize',
                limit: 50,
                on_page: async ({ response }) => {
                    const parsed = PaginationResponseSchema.parse(response.data);
                    pageToken = parsed.next_page_uri
                        ? (new URL(parsed.next_page_uri, 'https://api.twilio.com').searchParams.get('PageToken') ?? undefined)
                        : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const transcriptions = [];
            for (const item of page) {
                const parsed = ProviderTranscriptionSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse transcription: ${parsed.error.message}`);
                }
                const record = parsed.data;
                if (record.date_created) {
                    if (!maxDateCreated || new Date(record.date_created) > new Date(maxDateCreated)) {
                        maxDateCreated = record.date_created;
                    }
                }
                transcriptions.push({
                    id: record.sid,
                    ...(record.account_sid !== undefined && { account_sid: record.account_sid }),
                    ...(record.api_version !== undefined && { api_version: record.api_version }),
                    ...(record.date_created !== undefined && { date_created: record.date_created }),
                    ...(record.date_updated !== undefined && { date_updated: record.date_updated }),
                    ...(record.duration !== undefined && { duration: record.duration }),
                    ...(record.price !== null && record.price !== undefined && { price: record.price }),
                    ...(record.price_unit !== undefined && { price_unit: record.price_unit }),
                    ...(record.recording_sid !== undefined && { recording_sid: record.recording_sid }),
                    ...(record.status !== undefined && { status: record.status }),
                    ...(record.transcription_text !== null && record.transcription_text !== undefined && { transcription_text: record.transcription_text }),
                    ...(record.type !== undefined && { type: record.type }),
                    ...(record.uri !== undefined && { uri: record.uri })
                });
            }

            if (transcriptions.length > 0) {
                await nango.batchSave(transcriptions, 'Transcription');
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    date_created_after: dateCreatedAfter || '',
                    page_token: pageToken
                });
                continue;
            }

            if (maxDateCreated) {
                await nango.saveCheckpoint({
                    date_created_after: toDateString(maxDateCreated),
                    page_token: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
