import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ApiKeySchema = z.object({
    id: z.string(),
    friendly_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const ProviderKeySchema = z.object({
    sid: z.string(),
    friendly_name: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_updated: z.string().optional().nullable()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const BasicCredentialsSchema = z.object({
    type: z.literal('BASIC'),
    username: z.string()
});

const sync = createSync({
    description: 'Sync API keys from Twilio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/api-keys',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        ApiKey: ApiKeySchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }
        let pageToken = checkpoint?.data.page_token || undefined;

        const connection = await nango.getConnection();
        const credentialsResult = BasicCredentialsSchema.safeParse(connection.credentials);
        if (!credentialsResult.success) {
            throw new Error('Expected BASIC credentials for Twilio connection');
        }
        const accountSid = credentialsResult.data.username;

        // Blocker: Twilio Keys API has no changed-since filter or deleted-record endpoint,
        // so use full-refresh with trackDeletesStart/trackDeletesEnd.
        await nango.trackDeletesStart('ApiKey');

        const params: Record<string, string | number> = {
            PageSize: 50
        };
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/iam/api-keys/key-resource-v2010
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Keys.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'keys',
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
            const apiKeys = [];
            for (const item of page) {
                const parsed = ProviderKeySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse API key: ${parsed.error.message}`);
                }
                const record = parsed.data;
                apiKeys.push({
                    id: record.sid,
                    ...(record.friendly_name != null && { friendly_name: record.friendly_name }),
                    ...(record.date_created != null && { date_created: record.date_created }),
                    ...(record.date_updated != null && { date_updated: record.date_updated })
                });
            }

            if (apiKeys.length > 0) {
                await nango.batchSave(apiKeys, 'ApiKey');
            }

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ApiKey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
