import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import type { AxiosResponse } from 'axios';

const ConferenceSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    region: z.string().optional(),
    sid: z.string(),
    status: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    uri: z.string().optional(),
    reason_conference_ended: z.string().optional(),
    call_sid_ending_conference: z.string().optional()
});

const CheckpointSchema = z.object({
    date_updated_after: z.string(),
    page_token: z.string()
});

const BasicCredentialsSchema = z.object({
    type: z.literal('BASIC'),
    username: z.string()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const ProviderConferenceSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    region: z.string().optional(),
    status: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    uri: z.string().optional(),
    reason_conference_ended: z.string().optional().nullable(),
    call_sid_ending_conference: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    conferences: z.array(ProviderConferenceSchema),
    next_page_uri: z.string().nullable().optional(),
    first_page_uri: z.string().optional(),
    previous_page_uri: z.string().nullable().optional(),
    uri: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional()
});

const sync = createSync({
    description: 'Sync conferences from Twilio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/conferences',
            method: 'GET'
        }
    ],
    models: {
        Conference: ConferenceSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        const connection = await nango.getConnection();
        const credentials = BasicCredentialsSchema.safeParse(connection.credentials);
        const metadata = MetadataSchema.safeParse(await nango.getMetadata());
        const accountSid = credentials.success ? credentials.data.username : metadata.success ? metadata.data.account_sid : undefined;
        if (!accountSid) {
            throw new Error('Missing Twilio Account SID in connection credentials or metadata');
        }

        const params: Record<string, string | number> = {
            PageSize: 50
        };
        const dateUpdatedAfter = checkpoint?.data.date_updated_after || undefined;
        let pageToken = checkpoint?.data.page_token || undefined;

        if (dateUpdatedAfter) {
            params['DateUpdated'] = `>=${dateUpdatedAfter}`;
        }
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        let maxDateUpdated: string | undefined;

        // https://www.twilio.com/docs/voice/api/conference-resource
        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/voice/api/conference-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'conferences',
                limit_name_in_request: 'PageSize',
                limit: 50,
                on_page: async ({ response }: { response: AxiosResponse }) => {
                    const parsed = ProviderResponseSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error('Failed to parse Twilio conferences response');
                    }
                    const data = parsed.data;
                    pageToken = data.next_page_uri
                        ? (new URL(data.next_page_uri, 'https://api.twilio.com').searchParams.get('PageToken') ?? undefined)
                        : undefined;
                    for (const conference of data.conferences) {
                        if (conference.date_updated) {
                            if (!maxDateUpdated || conference.date_updated > maxDateUpdated) {
                                maxDateUpdated = conference.date_updated;
                            }
                        }
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const conferences: Array<z.infer<typeof ConferenceSchema>> = [];
            for (const record of page) {
                const parsed = ProviderConferenceSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error('Failed to parse Twilio conference record');
                }
                const conference = parsed.data;
                conferences.push({
                    id: conference.sid,
                    ...(conference.account_sid != null && { account_sid: conference.account_sid }),
                    ...(conference.api_version != null && { api_version: conference.api_version }),
                    ...(conference.date_created != null && { date_created: conference.date_created }),
                    ...(conference.date_updated != null && { date_updated: conference.date_updated }),
                    ...(conference.friendly_name != null && { friendly_name: conference.friendly_name }),
                    ...(conference.region != null && { region: conference.region }),
                    sid: conference.sid,
                    ...(conference.status != null && { status: conference.status }),
                    ...(conference.subresource_uris != null && { subresource_uris: conference.subresource_uris }),
                    ...(conference.uri != null && { uri: conference.uri }),
                    ...(conference.reason_conference_ended != null && { reason_conference_ended: conference.reason_conference_ended }),
                    ...(conference.call_sid_ending_conference != null && { call_sid_ending_conference: conference.call_sid_ending_conference })
                });
            }

            if (conferences.length > 0) {
                await nango.batchSave(conferences, 'Conference');
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    date_updated_after: dateUpdatedAfter || '',
                    page_token: pageToken || ''
                });
                continue;
            }

            if (maxDateUpdated) {
                const date = new Date(maxDateUpdated);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                const checkpointDate = `${year}-${month}-${day}`;
                await nango.saveCheckpoint({ date_updated_after: checkpointDate, page_token: '' });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
