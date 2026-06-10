import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRecordingSchema = z.object({
    sid: z.string(),
    account_sid: z.string().nullish(),
    api_version: z.string().nullish(),
    call_sid: z.string().nullish(),
    conference_sid: z.string().nullish(),
    channels: z.number().nullish(),
    date_created: z.string().nullish(),
    date_updated: z.string().nullish(),
    start_time: z.string().nullish(),
    duration: z.string().nullish(),
    price: z.string().nullish(),
    price_unit: z.string().nullish(),
    status: z.string().nullish(),
    source: z.string().nullish(),
    error_code: z.number().nullish(),
    uri: z.string().nullish(),
    subresource_uris: z.record(z.string(), z.string()).nullish(),
    media_url: z.string().nullish(),
    encryption_details: z
        .object({
            encryption_public_key_sid: z.string().nullish(),
            encryption_cek: z.string().nullish(),
            encryption_iv: z.string().nullish()
        })
        .nullish()
});

const RecordingSchema = z.object({
    id: z.string().describe('The unique string that identifies the Recording resource.'),
    sid: z.string().optional(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    call_sid: z.string().optional(),
    conference_sid: z.string().optional(),
    channels: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    error_code: z.number().optional(),
    uri: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    media_url: z.string().optional(),
    encryption_details: z
        .object({
            encryption_public_key_sid: z.string().optional(),
            encryption_cek: z.string().optional(),
            encryption_iv: z.string().optional()
        })
        .optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const CheckpointSchema = z.object({
    date_created_after: z.string(),
    page_token: z.string(),
    max_date_created: z.string()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullish()
});

function toDateString(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const sync = createSync({
    description: 'Sync recordings from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/recordings'
        }
    ],
    models: {
        Recording: RecordingSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        const dateCreatedAfter = checkpoint?.data?.date_created_after || undefined;
        let pageToken = checkpoint?.data?.page_token || undefined;
        let maxDateCreated = checkpoint?.data?.max_date_created || undefined;

        // https://www.twilio.com/docs/voice/api/recording#retrieve-a-list-of-recordings
        const connection = await nango.getConnection();
        const credentials = connection && typeof connection === 'object' && 'credentials' in connection ? connection.credentials : undefined;
        const accountSidFromCredentials =
            credentials && typeof credentials === 'object' && 'username' in credentials && typeof credentials.username === 'string'
                ? credentials.username
                : undefined;

        const metadata = await nango.getMetadata();
        const accountSidFromMetadata =
            metadata && typeof metadata === 'object' && 'account_sid' in metadata && typeof metadata.account_sid === 'string'
                ? metadata.account_sid
                : undefined;

        const accountSid = accountSidFromCredentials || accountSidFromMetadata;
        if (!accountSid) {
            throw new Error('Missing Twilio Account SID in connection credentials or metadata');
        }

        const params: Record<string, string | number> = { PageSize: 50 };
        if (dateCreatedAfter) {
            params['DateCreated>'] = dateCreatedAfter;
        }
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/voice/api/recording#retrieve-a-list-of-recordings
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Recordings.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'recordings',
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

        for await (const page of nango.paginate<z.infer<typeof ProviderRecordingSchema>>(proxyConfig)) {
            const recordings = [];
            for (const raw of page) {
                const parsed = ProviderRecordingSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse recording: ${parsed.error.message}`);
                }
                const data = parsed.data;
                recordings.push({
                    id: data.sid,
                    sid: data.sid ?? undefined,
                    account_sid: data.account_sid ?? undefined,
                    api_version: data.api_version ?? undefined,
                    call_sid: data.call_sid ?? undefined,
                    conference_sid: data.conference_sid ?? undefined,
                    channels: data.channels ?? undefined,
                    date_created: data.date_created ?? undefined,
                    date_updated: data.date_updated ?? undefined,
                    start_time: data.start_time ?? undefined,
                    duration: data.duration ?? undefined,
                    price: data.price ?? undefined,
                    price_unit: data.price_unit ?? undefined,
                    status: data.status ?? undefined,
                    source: data.source ?? undefined,
                    error_code: data.error_code ?? undefined,
                    uri: data.uri ?? undefined,
                    subresource_uris: data.subresource_uris ?? undefined,
                    media_url: data.media_url ?? undefined,
                    encryption_details: data.encryption_details ?? undefined
                });
                if (data.date_created) {
                    if (!maxDateCreated || new Date(data.date_created) > new Date(maxDateCreated)) {
                        maxDateCreated = data.date_created;
                    }
                }
            }

            if (recordings.length > 0) {
                await nango.batchSave(recordings, 'Recording');
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    date_created_after: dateCreatedAfter || '',
                    page_token: pageToken,
                    max_date_created: maxDateCreated || ''
                });
                continue;
            }

            if (maxDateCreated) {
                await nango.saveCheckpoint({
                    date_created_after: toDateString(maxDateCreated),
                    page_token: '',
                    max_date_created: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
