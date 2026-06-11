import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCapabilitiesSchema = z
    .object({
        voice: z.boolean().optional(),
        sms: z.boolean().optional(),
        mms: z.boolean().optional(),
        fax: z.boolean().optional()
    })
    .passthrough();

const ProviderIncomingPhoneNumberSchema = z
    .object({
        sid: z.string(),
        account_sid: z.string().optional(),
        address_sid: z.string().optional(),
        address_requirements: z.string().optional(),
        api_version: z.string().optional(),
        beta: z.boolean().optional(),
        capabilities: ProviderCapabilitiesSchema.optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        emergency_status: z.string().optional(),
        emergency_address_sid: z.string().optional(),
        emergency_address_status: z.string().optional(),
        friendly_name: z.string().optional(),
        identity_sid: z.string().optional(),
        origin: z.string().optional(),
        phone_number: z.string().optional(),
        sms_application_sid: z.string().optional(),
        sms_fallback_method: z.string().optional(),
        sms_fallback_url: z.string().optional(),
        sms_method: z.string().optional(),
        sms_url: z.string().optional(),
        status: z.string().optional(),
        status_callback: z.string().optional(),
        status_callback_method: z.string().optional(),
        trunk_sid: z.string().nullable().optional(),
        type: z.string().optional(),
        uri: z.string().optional(),
        voice_application_sid: z.string().optional(),
        voice_caller_id_lookup: z.boolean().optional(),
        voice_fallback_method: z.string().optional(),
        voice_fallback_url: z.string().optional(),
        voice_method: z.string().optional(),
        voice_receive_mode: z.string().optional(),
        voice_url: z.string().optional(),
        bundle_sid: z.string().optional()
    })
    .passthrough();

type ProviderIncomingPhoneNumber = z.infer<typeof ProviderIncomingPhoneNumberSchema>;

const IncomingPhoneNumberSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    address_sid: z.string().optional(),
    address_requirements: z.string().optional(),
    api_version: z.string().optional(),
    beta: z.boolean().optional(),
    capabilities: z
        .object({
            voice: z.boolean().optional(),
            sms: z.boolean().optional(),
            mms: z.boolean().optional(),
            fax: z.boolean().optional()
        })
        .optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    emergency_status: z.string().optional(),
    emergency_address_sid: z.string().optional(),
    emergency_address_status: z.string().optional(),
    friendly_name: z.string().optional(),
    identity_sid: z.string().optional(),
    origin: z.string().optional(),
    phone_number: z.string().optional(),
    sid: z.string().optional(),
    sms_application_sid: z.string().optional(),
    sms_fallback_method: z.string().optional(),
    sms_fallback_url: z.string().optional(),
    sms_method: z.string().optional(),
    sms_url: z.string().optional(),
    status: z.string().optional(),
    status_callback: z.string().optional(),
    status_callback_method: z.string().optional(),
    trunk_sid: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional(),
    voice_application_sid: z.string().optional(),
    voice_caller_id_lookup: z.boolean().optional(),
    voice_fallback_method: z.string().optional(),
    voice_fallback_url: z.string().optional(),
    voice_method: z.string().optional(),
    voice_receive_mode: z.string().optional(),
    voice_url: z.string().optional(),
    bundle_sid: z.string().optional()
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
    description: 'Sync incoming phone numbers from Twilio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/incoming-phone-numbers'
        }
    ],
    models: {
        IncomingPhoneNumber: IncomingPhoneNumberSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        // https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
        const connection = await nango.getConnection();
        const credentials = connection.credentials;
        if (credentials.type !== 'BASIC') {
            throw new Error('Expected BASIC credentials for Twilio connection');
        }
        const accountSid = credentials.username;

        const dateCreatedAfter = checkpoint?.data.date_created_after || undefined;
        let pageToken = checkpoint?.data.page_token || undefined;
        let maxDateCreated: string | undefined;

        const params: Record<string, string> = {};
        // Note: Twilio's IncomingPhoneNumbers endpoint does not support DateCreated> filtering;
        // the checkpoint date is tracked for future reference but not sent as a query param.
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/IncomingPhoneNumbers.json`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next_page_uri',
                response_path: 'incoming_phone_numbers',
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
            const phoneNumbers: Array<z.infer<typeof IncomingPhoneNumberSchema>> = [];

            for (const rawRecord of page) {
                const parsed = ProviderIncomingPhoneNumberSchema.safeParse(rawRecord);
                if (!parsed.success) {
                    throw new Error(`Failed to parse incoming phone number: ${parsed.error.message}`);
                }
                const record: ProviderIncomingPhoneNumber = parsed.data;
                if (record.date_created) {
                    if (!maxDateCreated || new Date(record.date_created) > new Date(maxDateCreated)) {
                        maxDateCreated = record.date_created;
                    }
                }
                phoneNumbers.push({
                    id: record.sid,
                    account_sid: record.account_sid,
                    address_sid: record.address_sid,
                    address_requirements: record.address_requirements,
                    api_version: record.api_version,
                    beta: record.beta,
                    capabilities: record.capabilities,
                    date_created: record.date_created,
                    date_updated: record.date_updated,
                    emergency_status: record.emergency_status,
                    emergency_address_sid: record.emergency_address_sid,
                    emergency_address_status: record.emergency_address_status,
                    friendly_name: record.friendly_name,
                    identity_sid: record.identity_sid,
                    origin: record.origin,
                    phone_number: record.phone_number,
                    sid: record.sid,
                    sms_application_sid: record.sms_application_sid,
                    sms_fallback_method: record.sms_fallback_method,
                    sms_fallback_url: record.sms_fallback_url,
                    sms_method: record.sms_method,
                    sms_url: record.sms_url,
                    status: record.status,
                    status_callback: record.status_callback,
                    status_callback_method: record.status_callback_method,
                    trunk_sid: record.trunk_sid ?? undefined,
                    type: record.type,
                    uri: record.uri,
                    voice_application_sid: record.voice_application_sid,
                    voice_caller_id_lookup: record.voice_caller_id_lookup,
                    voice_fallback_method: record.voice_fallback_method,
                    voice_fallback_url: record.voice_fallback_url,
                    voice_method: record.voice_method,
                    voice_receive_mode: record.voice_receive_mode,
                    voice_url: record.voice_url,
                    bundle_sid: record.bundle_sid
                });
            }

            if (phoneNumbers.length > 0) {
                await nango.batchSave(phoneNumbers, 'IncomingPhoneNumber');
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
