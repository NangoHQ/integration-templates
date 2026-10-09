import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page of subscriptions to retrieve, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().max(200).optional().describe('Number of subscriptions per page, between 1 and 200. Defaults to 200.')
    })
    .describe('Optional pagination for listing webhook subscriptions.');

const ProviderWatchSchema = z.object({
    channel_id: z.string().nullable(),
    resource_name: z.string().nullable(),
    resource_id: z.string().nullable(),
    resource_uri: z.string().nullable(),
    notify_url: z.string().nullable(),
    events: z.array(z.string()).nullable(),
    channel_expiry: z.string().nullable(),
    token: z.string().nullable(),
    notify_on_related_action: z.boolean().nullable(),
    return_affected_field_values: z.boolean().nullable(),
    fields: z.array(z.string()).nullable()
});

const ProviderResponseSchema = z.object({
    watch: z.array(ProviderWatchSchema).optional(),
    info: z
        .object({
            per_page: z.number().optional(),
            count: z.number().optional(),
            page: z.number().optional(),
            more_records: z.boolean().optional()
        })
        .optional()
});

const WatchSchema = z.object({
    channel_id: z.string().optional().describe('Unique ID of the notification channel. Example: "9876543210123"'),
    resource_name: z.string().optional().describe('API name of the watched module. Example: "Contacts"'),
    resource_id: z.string().optional().describe('ID of the watched module. Example: "7618134000000002179"'),
    resource_uri: z.string().optional().describe('API URL of the watched module. Example: "https://www.zohoapis.com/bigin/v2/Contacts"'),
    notify_url: z.string().optional().describe('Webhook URL that Bigin calls when a subscribed event fires.'),
    events: z.array(z.string()).optional().describe('Subscribed events in "<Module>.<operation>" form. Example: ["Contacts.create"]'),
    channel_expiry: z.string().optional().describe('ISO 8601 timestamp after which the channel subscription stops.'),
    token: z.string().optional().describe('Caller-supplied verification token echoed back in each notification, when set.'),
    notify_on_related_action: z.boolean().optional().describe('Whether notifications also fire for related-record actions.'),
    return_affected_field_values: z.boolean().optional().describe('Whether notifications include the affected field values.'),
    fields: z.array(z.string()).optional().describe('Field API names the subscription is limited to, when field-level notifications are configured.')
});

const InfoSchema = z.object({
    per_page: z.number().optional().describe('Maximum number of subscriptions returned per page.'),
    count: z.number().optional().describe('Number of subscriptions returned in this response.'),
    page: z.number().optional().describe('Page number of this response.'),
    more_records: z.boolean().optional().describe('Whether additional subscriptions exist on later pages.')
});

const OutputSchema = z
    .object({
        watch: z.array(WatchSchema).describe('Active webhook subscriptions for this connection. Empty when none are enabled.'),
        info: InfoSchema.optional().describe('Pagination metadata; omitted when the requested page has no subscriptions.')
    })
    .describe('Active webhook subscriptions and optional pagination metadata for this connection.');

/**
 * @tags: [read]
 * @tagReason: Reads the connection's existing webhook subscriptions without changing any provider state.
 * @pitfalls: Returns an empty list rather than an error when no subscriptions exist; subscriptions stop at channel_expiry and then disappear; one page of up to per_page (default 200) subscriptions is returned per call, so request the next page while info.more_records is true; token and fields may be null.
 */
const action = createAction({
    description: 'List the active webhook (actions-watch) notification subscriptions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.notifications.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/notifications/get-details.html
            endpoint: '/bigin/v2/actions/watch',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        if (response.status === 204) {
            return { watch: [] };
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            watch: (parsed.watch ?? []).map((item) => ({
                ...(item.channel_id != null && { channel_id: item.channel_id }),
                ...(item.resource_name != null && { resource_name: item.resource_name }),
                ...(item.resource_id != null && { resource_id: item.resource_id }),
                ...(item.resource_uri != null && { resource_uri: item.resource_uri }),
                ...(item.notify_url != null && { notify_url: item.notify_url }),
                ...(item.events != null && { events: item.events }),
                ...(item.channel_expiry != null && { channel_expiry: item.channel_expiry }),
                ...(item.token != null && { token: item.token }),
                ...(item.notify_on_related_action != null && { notify_on_related_action: item.notify_on_related_action }),
                ...(item.return_affected_field_values != null && { return_affected_field_values: item.return_affected_field_values }),
                ...(item.fields != null && { fields: item.fields })
            })),
            ...(parsed.info != null && {
                info: {
                    ...(parsed.info.per_page != null && { per_page: parsed.info.per_page }),
                    ...(parsed.info.count != null && { count: parsed.info.count }),
                    ...(parsed.info.page != null && { page: parsed.info.page }),
                    ...(parsed.info.more_records != null && { more_records: parsed.info.more_records })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
