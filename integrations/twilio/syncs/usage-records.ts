import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

function formatDate(date: Date): string {
    const iso = date.toISOString();
    const idx = iso.indexOf('T');
    return iso.slice(0, idx);
}

const _TwilioUsageRecordSchema = z.object({
    account_sid: z.string().nullable().optional(),
    api_version: z.string().nullable().optional(),
    as_of: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    count: z.string().nullable().optional(),
    count_unit: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    subresource_uris: z.record(z.string(), z.string()).nullable().optional(),
    uri: z.string().nullable().optional(),
    usage: z.string().nullable().optional(),
    usage_unit: z.string().nullable().optional()
});

const UsageRecordSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    as_of: z.string().optional(),
    category: z.string().optional(),
    count: z.string().optional(),
    count_unit: z.string().optional(),
    description: z.string().optional(),
    end_date: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    start_date: z.string().optional(),
    uri: z.string().optional(),
    usage: z.string().optional(),
    usage_unit: z.string().optional()
});

const CheckpointSchema = z.object({
    current_date: z.string()
});

const sync = createSync({
    description: 'Sync usage and billing records from Twilio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        UsageRecord: UsageRecordSchema
    },
    endpoints: [
        {
            path: '/syncs/usage-records',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        // https://www.twilio.com/docs/usage/api/usage-record
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();
        const accountSidFromConnection =
            connection.credentials &&
            typeof connection.credentials === 'object' &&
            'username' in connection.credentials &&
            typeof connection.credentials.username === 'string'
                ? connection.credentials.username
                : undefined;
        const accountSidFromMetadata = typeof metadata?.['account_sid'] === 'string' ? metadata['account_sid'] : undefined;
        const accountSid = accountSidFromConnection || accountSidFromMetadata;
        if (!accountSid) {
            throw new Error('Missing Twilio Account SID in connection credentials or metadata');
        }

        const today = formatDate(new Date());
        const startDate = checkpoint?.data.current_date || formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/usage/api/usage-record
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Usage/Records.json`,
            params: {
                StartDate: startDate,
                EndDate: today,
                pageSize: 50
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'usage_records'
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof _TwilioUsageRecordSchema>>(proxyConfig)) {
            const mapped = page.map((record) => {
                const category = record.category ?? 'unknown';
                const startDateValue = record.start_date ?? 'unknown';
                const endDateValue = record.end_date ?? 'unknown';
                return {
                    id: `${category}-${startDateValue}-${endDateValue}`,
                    ...(record.account_sid != null && { account_sid: record.account_sid }),
                    ...(record.api_version != null && { api_version: record.api_version }),
                    ...(record.as_of != null && { as_of: record.as_of }),
                    ...(record.category != null && { category: record.category }),
                    ...(record.count != null && { count: record.count }),
                    ...(record.count_unit != null && { count_unit: record.count_unit }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.end_date != null && { end_date: record.end_date }),
                    ...(record.price != null && { price: record.price }),
                    ...(record.price_unit != null && { price_unit: record.price_unit }),
                    ...(record.start_date != null && { start_date: record.start_date }),
                    ...(record.uri != null && { uri: record.uri }),
                    ...(record.usage != null && { usage: record.usage }),
                    ...(record.usage_unit != null && { usage_unit: record.usage_unit })
                };
            });

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'UsageRecord');
            }
        }

        await nango.saveCheckpoint({ current_date: today });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
