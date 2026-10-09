import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        channel_id: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('Unique numeric identifier for the notification channel. Example: "1001"'),
        events: z.array(z.string()).describe('Events to subscribe to, each in "Module.operation" format. Example: ["Contacts.create"]'),
        notify_url: z.string().describe('Publicly reachable webhook URL that receives the notifications. Example: "https://example.com/webhook"'),
        channel_expiry: z.string().optional().describe('ISO 8601 expiry for the channel, at most one day in the future. Example: "2026-10-09T10:30:00+05:30"'),
        token: z.string().optional().describe('Verification token (max 50 characters) echoed back in each notification body.')
    })
    .describe('Input for subscribing a webhook URL to real-time notifications for events on a Bigin module.');

const SubscriptionSchema = z.object({
    channel_id: z.string().describe('Unique channel identifier, echoed back in every notification.'),
    resource_name: z.string().optional().describe('API name of the module the subscription applies to. Example: "Contacts".'),
    resource_id: z.string().optional().describe('Provider ID of the module resource.'),
    resource_uri: z.string().optional().describe('Provider URL of the module resource.'),
    channel_expiry: z.string().optional().describe('ISO 8601 timestamp when the channel subscription expires.')
});

const OutputSchema = z
    .object({
        subscriptions: z.array(SubscriptionSchema).describe('Subscriptions created, one per module event.'),
        status: z.string().optional().describe('Overall subscription status reported by the provider. Example: "success".'),
        message: z.string().optional().describe('Human-readable result message from the provider.')
    })
    .describe('Result of enabling module notifications, including the subscriptions that were created.');

const WatchEntrySchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    details: z
        .object({
            events: z.array(SubscriptionSchema).optional()
        })
        .optional()
});

const ResponseSchema = z.object({
    watch: z.array(WatchEntrySchema).optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates webhook notification subscriptions on the provider, a provider-facing mutation.
 * @pitfalls: The subscription expires on its own after a short provider default (observed at roughly two hours) unless channel_expiry is supplied, which can be at most one day in the future; notifications are only delivered to a publicly reachable notify_url.
 */
const action = createAction({
    description: 'Subscribe a webhook URL to receive real-time notifications for events (e.g. record created) on a given module.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.notifications.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/notifications/enable.html
            endpoint: '/bigin/v2/actions/watch',
            data: {
                watch: [
                    {
                        channel_id: input.channel_id,
                        events: input.events,
                        notify_url: input.notify_url,
                        ...(input.channel_expiry !== undefined && { channel_expiry: input.channel_expiry }),
                        ...(input.token !== undefined && { token: input.token })
                    }
                ]
            },
            // Safe to retry: re-subscribing the same channel_id is idempotent (returns SUCCESS and refreshes the expiry).
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const entries = parsed.watch ?? [];

        const failed = entries.find((entry) => entry.code != null && entry.code !== 'SUCCESS');
        if (failed) {
            throw new nango.ActionError({
                type: 'subscription_failed',
                message: failed.message ?? 'Failed to subscribe to notifications',
                ...(failed.code != null && { code: failed.code })
            });
        }

        const first = entries[0];
        const subscriptions = entries.flatMap((entry) => entry.details?.events ?? []);

        return {
            subscriptions,
            ...(first?.status != null && { status: first.status }),
            ...(first?.message != null && { message: first.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
