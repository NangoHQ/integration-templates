import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMessageSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    body: z.string().optional(),
    num_segments: z.string().optional(),
    direction: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    date_updated: z.string().optional(),
    price: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    uri: z.string().optional(),
    num_media: z.string().optional(),
    status: z.string().optional(),
    messaging_service_sid: z.string().nullable().optional(),
    date_sent: z.string().nullable().optional(),
    date_created: z.string().optional(),
    error_code: z.number().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional()
});

const PaginationResponseSchema = z.object({
    next_page_uri: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    date_sent_after: z.string(),
    page_token: z.string()
});

const MessageSchema = z.object({
    id: z.string(),
    sid: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    body: z.string().optional(),
    num_segments: z.string().optional(),
    direction: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    date_updated: z.string().optional(),
    price: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    uri: z.string().optional(),
    num_media: z.string().optional(),
    status: z.string().optional(),
    messaging_service_sid: z.string().nullable().optional(),
    date_sent: z.string().nullable().optional(),
    date_created: z.string().optional(),
    error_code: z.number().nullable().optional(),
    price_unit: z.string().nullable().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional()
});

function toDateString(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const sync = createSync({
    description: 'Sync SMS/MMS messages from Twilio.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/messages' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        const dateSentAfter = checkpoint?.data.date_sent_after || undefined;
        let pageToken = checkpoint?.data.page_token || undefined;

        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        let accountSid: string | undefined;
        if (credentials && 'username' in credentials && typeof credentials.username === 'string') {
            accountSid = credentials.username;
        }
        if (!accountSid) {
            const metadata: unknown = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'account_sid' in metadata && typeof metadata.account_sid === 'string') {
                accountSid = metadata.account_sid;
            }
        }
        if (!accountSid) {
            throw new Error('Unable to determine AccountSid from connection credentials');
        }

        let maxDateSent: string | undefined;

        const params: Record<string, string | number> = {
            PageSize: 50
        };
        if (dateSentAfter) {
            params['DateSent>'] = dateSentAfter;
        }
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sms/api/message-resource#read-multiple-message-resources
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'messages',
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

        for await (const page of nango.paginate<z.infer<typeof ProviderMessageSchema>>(proxyConfig)) {
            const messages = page.map((record) => ({
                id: record.sid,
                sid: record.sid,
                account_sid: record.account_sid,
                api_version: record.api_version,
                body: record.body,
                num_segments: record.num_segments,
                direction: record.direction,
                from: record.from,
                to: record.to,
                date_updated: record.date_updated,
                price: record.price,
                error_message: record.error_message,
                uri: record.uri,
                num_media: record.num_media,
                status: record.status,
                messaging_service_sid: record.messaging_service_sid,
                date_sent: record.date_sent,
                date_created: record.date_created,
                error_code: record.error_code,
                price_unit: record.price_unit,
                subresource_uris: record.subresource_uris
            }));

            if (messages.length > 0) {
                await nango.batchSave(messages, 'Message');
                for (const message of messages) {
                    if (message.date_sent) {
                        if (!maxDateSent || new Date(message.date_sent) > new Date(maxDateSent)) {
                            maxDateSent = message.date_sent;
                        }
                    }
                }
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    date_sent_after: dateSentAfter || '',
                    page_token: pageToken
                });
                continue;
            }

            if (maxDateSent) {
                await nango.saveCheckpoint({
                    date_sent_after: toDateString(maxDateSent),
                    page_token: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
