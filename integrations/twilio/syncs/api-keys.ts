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
    models: {
        ApiKey: ApiKeySchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const credentialsResult = BasicCredentialsSchema.safeParse(connection.credentials);
        if (!credentialsResult.success) {
            throw new Error('Expected BASIC credentials for Twilio connection');
        }
        const accountSid = credentialsResult.data.username;

        // Blocker: Twilio Keys API only supports PageSize/Page/PageToken pagination
        // with no changed-since filter, no deleted-record endpoint, and no resumable
        // cursor that can be used for incremental filtering.
        await nango.trackDeletesStart('ApiKey');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/iam/api-keys/key-resource-v2010
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Keys.json`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'keys',
                limit_name_in_request: 'PageSize',
                limit: 50
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
        }

        await nango.trackDeletesEnd('ApiKey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
