import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    date_created: z.string().optional().nullable(),
    list_rating: z.number().optional().nullable(),
    email_type_option: z.boolean().optional().nullable(),
    visibility: z.string().optional().nullable(),
    double_optin: z.boolean().optional().nullable(),
    has_welcome: z.boolean().optional().nullable(),
    marketing_permissions: z.boolean().optional().nullable(),
    permission_reminder: z.string().optional().nullable(),
    notify_on_subscribe: z.string().optional().nullable(),
    notify_on_unsubscribe: z.string().optional().nullable(),
    subscribe_url_short: z.string().optional().nullable(),
    subscribe_url_long: z.string().optional().nullable(),
    beamer_address: z.string().optional().nullable(),
    web_id: z.number().optional().nullable(),
    stats: z.record(z.string(), z.unknown()).optional().nullable()
});

const AudienceSchema = z.object({
    id: z.string(),
    name: z.string(),
    date_created: z.string().optional(),
    list_rating: z.number().optional(),
    email_type_option: z.boolean().optional(),
    visibility: z.string().optional(),
    double_optin: z.boolean().optional(),
    has_welcome: z.boolean().optional(),
    marketing_permissions: z.boolean().optional(),
    permission_reminder: z.string().optional(),
    notify_on_subscribe: z.string().optional(),
    notify_on_unsubscribe: z.string().optional(),
    subscribe_url_short: z.string().optional(),
    subscribe_url_long: z.string().optional(),
    beamer_address: z.string().optional(),
    web_id: z.number().optional(),
    stats: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync audiences from Mailchimp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Audience: AudienceSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/audiences'
        }
    ],

    exec: async (nango) => {
        // Blocker: Mailchimp GET /3.0/lists only exposes since_date_created and
        // since_campaign_last_sent filters, neither of which reliably capture all
        // list modifications (name changes, settings updates, etc.). There is no
        // updated_since or equivalent changed-since filter, so full refresh is
        // required to keep audience data consistent.
        await nango.trackDeletesStart('Audience');

        const proxyConfig: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/lists/get-lists-info/
            endpoint: '/3.0/lists',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'lists'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const audiences = [];
            for (const item of page) {
                const parsed = ProviderListSchema.parse(item);
                audiences.push({
                    id: parsed.id,
                    name: parsed.name,
                    ...(parsed.date_created != null && { date_created: parsed.date_created }),
                    ...(parsed.list_rating != null && { list_rating: parsed.list_rating }),
                    ...(parsed.email_type_option != null && { email_type_option: parsed.email_type_option }),
                    ...(parsed.visibility != null && { visibility: parsed.visibility }),
                    ...(parsed.double_optin != null && { double_optin: parsed.double_optin }),
                    ...(parsed.has_welcome != null && { has_welcome: parsed.has_welcome }),
                    ...(parsed.marketing_permissions != null && { marketing_permissions: parsed.marketing_permissions }),
                    ...(parsed.permission_reminder != null && { permission_reminder: parsed.permission_reminder }),
                    ...(parsed.notify_on_subscribe != null && { notify_on_subscribe: parsed.notify_on_subscribe }),
                    ...(parsed.notify_on_unsubscribe != null && { notify_on_unsubscribe: parsed.notify_on_unsubscribe }),
                    ...(parsed.subscribe_url_short != null && { subscribe_url_short: parsed.subscribe_url_short }),
                    ...(parsed.subscribe_url_long != null && { subscribe_url_long: parsed.subscribe_url_long }),
                    ...(parsed.beamer_address != null && { beamer_address: parsed.beamer_address }),
                    ...(parsed.web_id != null && { web_id: parsed.web_id }),
                    ...(parsed.stats != null && { stats: parsed.stats })
                });
            }

            if (audiences.length > 0) {
                await nango.batchSave(audiences, 'Audience');
            }
        }

        await nango.trackDeletesEnd('Audience');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
