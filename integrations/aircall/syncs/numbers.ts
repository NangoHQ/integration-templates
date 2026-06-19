import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMessagesSchema = z.object({
    welcome: z.string().optional(),
    waiting: z.string().optional(),
    ivr: z.string().optional(),
    voicemail: z.string().optional(),
    closed: z.string().optional(),
    callback_later: z.string().optional(),
    unanswered_call: z.string().optional(),
    after_hours: z.string().optional(),
    ringing_tone: z.string().optional()
});

const ProviderNumberSchema = z.object({
    id: z.number().describe('Unique identifier for the Number'),
    direct_link: z.string().describe('Direct API URL'),
    name: z.string().describe('The name of the Number'),
    digits: z.string().describe('International format of the Number'),
    e164_digits: z.string().optional().describe('Number in E.164 format'),
    created_at: z.string().describe('Timestamp when the Number was created, in UTC'),
    country: z.string().describe('ISO 3166-1 alpha-2 country code of the Number'),
    time_zone: z.string().describe("Number's time zone, set in the Dashboard"),
    open: z.boolean().optional().describe('Deprecated. Availability status for Smartflows numbers'),
    availability_status: z.string().optional().describe('Returns the availability status based on the first Time Rule widget in the number flow'),
    is_ivr: z.boolean().optional().describe('Deprecated. Whether an IVR was configured for this number'),
    live_recording_activated: z.boolean().describe('Whether a Number has live recording activated or not'),
    priority: z.number().nullable().optional().describe('Priority level of the number used during routing of the calls'),
    messages: ProviderMessagesSchema.optional().describe("URL to Number's music & messages files")
});

const NumberSchema = z.object({
    id: z.string().describe('Unique identifier for the Number'),
    direct_link: z.string().describe('Direct API URL'),
    name: z.string().describe('The name of the Number'),
    digits: z.string().describe('International format of the Number'),
    e164_digits: z.string().optional().describe('Number in E.164 format'),
    created_at: z.string().describe('Timestamp when the Number was created, in UTC'),
    country: z.string().describe('ISO 3166-1 alpha-2 country code of the Number'),
    time_zone: z.string().describe("Number's time zone, set in the Dashboard"),
    open: z.boolean().optional().describe('Deprecated. Availability status for Smartflows numbers'),
    availability_status: z.string().optional().describe('Returns the availability status based on the first Time Rule widget in the number flow'),
    is_ivr: z.boolean().optional().describe('Deprecated. Whether an IVR was configured for this number'),
    live_recording_activated: z.boolean().describe('Whether a Number has live recording activated or not'),
    priority: z.number().nullable().optional().describe('Priority level of the number used during routing of the calls'),
    messages: ProviderMessagesSchema.optional().describe("URL to Number's music & messages files")
});

const sync = createSync({
    description: 'Sync phone numbers from Aircall.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://developer.aircall.io/api-references/#number
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/numbers'
        }
    ],
    models: {
        Number: NumberSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/numbers does not support an updated_after or changed-since filter,
        // and there is no deleted-record endpoint or resumable cursor for numbers.
        // Full refresh with trackDeletesStart/trackDeletesEnd is required.
        await nango.trackDeletesStart('Number');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-numbers
            endpoint: '/v1/numbers',
            params: {
                page: 1,
                per_page: 50
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_link',
                response_path: 'numbers',
                limit: 50,
                limit_name_in_request: 'per_page'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const numbers = page.map((record: unknown) => {
                const parsed = ProviderNumberSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse number: ${parsed.error.message}`);
                }
                const providerNumber = parsed.data;
                return {
                    id: String(providerNumber.id),
                    direct_link: providerNumber.direct_link,
                    name: providerNumber.name,
                    digits: providerNumber.digits,
                    ...(providerNumber.e164_digits !== undefined && { e164_digits: providerNumber.e164_digits }),
                    created_at: providerNumber.created_at,
                    country: providerNumber.country,
                    time_zone: providerNumber.time_zone,
                    ...(providerNumber.open !== undefined && { open: providerNumber.open }),
                    ...(providerNumber.availability_status !== undefined && { availability_status: providerNumber.availability_status }),
                    ...(providerNumber.is_ivr !== undefined && { is_ivr: providerNumber.is_ivr }),
                    live_recording_activated: providerNumber.live_recording_activated,
                    ...(providerNumber.priority !== undefined && { priority: providerNumber.priority }),
                    ...(providerNumber.messages !== undefined && { messages: providerNumber.messages })
                };
            });

            if (numbers.length > 0) {
                await nango.batchSave(numbers, 'Number');
            }
        }

        await nango.trackDeletesEnd('Number');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
