import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderQueueSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().optional(),
    current_size: z.number().optional(),
    average_wait_time: z.number().optional(),
    max_size: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    uri: z.string().optional()
});

const QueueSchema = z.object({
    id: z.string().describe('Queue SID. Example: QUaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    account_sid: z.string().describe('Account SID. Example: ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    friendly_name: z.string().optional(),
    current_size: z.number().optional(),
    average_wait_time: z.number().optional(),
    max_size: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    uri: z.string().optional()
});

const BasicCredentialsSchema = z.object({
    type: z.literal('BASIC'),
    username: z.string(),
    password: z.string()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync call queues from Twilio',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Queue: QueueSchema
    },
    metadata: MetadataSchema,
    endpoints: [
        {
            path: '/syncs/queues',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        const connection = await nango.getConnection();
        const credentials = BasicCredentialsSchema.safeParse(connection.credentials);
        let accountSid: string | undefined;
        if (credentials.success) {
            accountSid = credentials.data.username;
        }

        if (!accountSid) {
            const metadata = await nango.getMetadata();
            if (metadata.account_sid) {
                accountSid = metadata.account_sid;
            }
        }

        if (!accountSid) {
            throw new Error('Account SID not found in connection credentials or metadata');
        }

        let pageToken = checkpoint?.data.page_token || undefined;

        // Blocker: Twilio Queues API does not support updated_since, modified_since, or any
        // changed-records filter. The list endpoint always returns the full set, so full refresh
        // with deletion detection is required.
        await nango.trackDeletesStart('Queue');

        const params: Record<string, string | number> = {
            PageSize: 50
        };
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/voice/api/queue-resource#retrieve-a-list-of-queues
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'queues',
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
            const queues = page.map((record: unknown) => {
                const parsed = ProviderQueueSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse queue: ${parsed.error.message}`);
                }
                return {
                    id: parsed.data.sid,
                    account_sid: parsed.data.account_sid,
                    friendly_name: parsed.data.friendly_name,
                    current_size: parsed.data.current_size,
                    average_wait_time: parsed.data.average_wait_time,
                    max_size: parsed.data.max_size,
                    date_created: parsed.data.date_created,
                    date_updated: parsed.data.date_updated,
                    uri: parsed.data.uri
                };
            });

            if (queues.length > 0) {
                await nango.batchSave(queues, 'Queue');
            }

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Queue');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
