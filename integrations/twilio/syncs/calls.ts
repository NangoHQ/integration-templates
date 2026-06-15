import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const _TwilioCallSchema = z.object({
    sid: z.string(),
    account_sid: z.string().nullable(),
    answered_by: z.string().nullable(),
    api_version: z.string().nullable(),
    caller_name: z.string().nullable(),
    date_created: z.string().nullable(),
    date_updated: z.string().nullable(),
    direction: z.string().nullable(),
    duration: z.string().nullable(),
    end_time: z.string().nullable(),
    forwarded_from: z.string().nullable(),
    from: z.string().nullable(),
    from_formatted: z.string().nullable(),
    group_sid: z.string().nullable(),
    parent_call_sid: z.string().nullable(),
    phone_number_sid: z.string().nullable(),
    price: z.string().nullable(),
    price_unit: z.string().nullable(),
    start_time: z.string().nullable(),
    status: z.string().nullable(),
    subresource_uris: z.record(z.string(), z.string()).nullable(),
    to: z.string().nullable(),
    to_formatted: z.string().nullable(),
    trunk_sid: z.string().nullable(),
    uri: z.string().nullable(),
    queue_time: z.string().nullable()
});

const CallSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    answered_by: z.string().optional(),
    api_version: z.string().optional(),
    caller_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    direction: z.string().optional(),
    duration: z.string().optional(),
    end_time: z.string().optional(),
    forwarded_from: z.string().optional(),
    from: z.string().optional(),
    from_formatted: z.string().optional(),
    group_sid: z.string().optional(),
    parent_call_sid: z.string().optional(),
    phone_number_sid: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(),
    start_time: z.string().optional(),
    status: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    to: z.string().optional(),
    to_formatted: z.string().optional(),
    trunk_sid: z.string().optional(),
    uri: z.string().optional(),
    queue_time: z.string().optional()
});

const CheckpointSchema = z.object({
    start_time_after: z.string(),
    page_token: z.string()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullable().optional()
});

function toDateString(dateStr: string): string {
    const result = new Date(dateStr).toISOString().split('T')[0];
    if (!result) {
        throw new Error('Invalid date string');
    }
    return result;
}

function normalizeNull<T>(value: T | null | undefined): T | undefined {
    return value === null ? undefined : value;
}

const sync = createSync({
    description: 'Sync calls from Twilio.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Call: CallSchema
    },
    endpoints: [
        {
            path: '/syncs/calls',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

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

        let maxStartTime: string | undefined;
        const startTimeAfter = checkpoint?.data.start_time_after || undefined;
        let pageToken = checkpoint?.data.page_token || undefined;

        const params: Record<string, string> = {};
        if (startTimeAfter) {
            params['StartTime>'] = startTimeAfter;
        }
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/voice/api/call-resource#retrieve-a-list-of-calls
            endpoint: '/2010-04-01/Accounts/' + encodeURIComponent(accountSid) + '/Calls.json',
            params: params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'calls',
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

        for await (const page of nango.paginate<z.infer<typeof _TwilioCallSchema>>(proxyConfig)) {
            const calls = page.map((call) => ({
                id: call.sid,
                account_sid: normalizeNull(call.account_sid),
                answered_by: normalizeNull(call.answered_by),
                api_version: normalizeNull(call.api_version),
                caller_name: normalizeNull(call.caller_name),
                date_created: normalizeNull(call.date_created),
                date_updated: normalizeNull(call.date_updated),
                direction: normalizeNull(call.direction),
                duration: normalizeNull(call.duration),
                end_time: normalizeNull(call.end_time),
                forwarded_from: normalizeNull(call.forwarded_from),
                from: normalizeNull(call.from),
                from_formatted: normalizeNull(call.from_formatted),
                group_sid: normalizeNull(call.group_sid),
                parent_call_sid: normalizeNull(call.parent_call_sid),
                phone_number_sid: normalizeNull(call.phone_number_sid),
                price: normalizeNull(call.price),
                price_unit: normalizeNull(call.price_unit),
                start_time: normalizeNull(call.start_time),
                status: normalizeNull(call.status),
                subresource_uris: normalizeNull(call.subresource_uris),
                to: normalizeNull(call.to),
                to_formatted: normalizeNull(call.to_formatted),
                trunk_sid: normalizeNull(call.trunk_sid),
                uri: normalizeNull(call.uri),
                queue_time: normalizeNull(call.queue_time)
            }));

            if (calls.length === 0) {
                if (pageToken) {
                    await nango.saveCheckpoint({
                        start_time_after: startTimeAfter || '',
                        page_token: pageToken || ''
                    });
                }
                continue;
            }

            for (const call of calls) {
                if (call.start_time) {
                    if (!maxStartTime || new Date(call.start_time) > new Date(maxStartTime)) {
                        maxStartTime = call.start_time;
                    }
                }
            }

            await nango.batchSave(calls, 'Call');

            if (pageToken) {
                await nango.saveCheckpoint({
                    start_time_after: startTimeAfter || '',
                    page_token: pageToken || ''
                });
                continue;
            }

            if (maxStartTime) {
                await nango.saveCheckpoint({
                    start_time_after: toDateString(maxStartTime),
                    page_token: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
