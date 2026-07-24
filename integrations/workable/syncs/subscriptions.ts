import { createSync } from 'nango';
import { z } from 'zod';

const SubscriptionSchema = z.object({
    id: z.string(),
    target: z.string(),
    event: z.string().optional(),
    valid_until: z.string().optional(),
    created_at: z.string().optional(),
    stage_slug: z.string().optional(),
    job_shortcode: z.string().optional()
});

const ProviderSubscriptionSchema = z.object({
    id: z.number().int(),
    target: z.string(),
    event: z.string().nullish(),
    valid_until: z.string().nullish(),
    created_at: z.string().nullish(),
    stage_slug: z.string().nullish(),
    job_shortcode: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    subscriptions: z.array(ProviderSubscriptionSchema)
});

const sync = createSync({
    description: "Sync the account's registered webhook subscriptions",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Subscription: SubscriptionSchema
    },

    exec: async (nango) => {
        // https://workable.readme.io/reference/subscriptions
        const response = await nango.get({
            endpoint: '/spi/v3/subscriptions',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid response from Workable subscriptions endpoint: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Subscription');

        const subscriptions = parsed.data.subscriptions.map((subscription) => ({
            id: String(subscription.id),
            target: subscription.target,
            ...(subscription.event != null && { event: subscription.event }),
            ...(subscription.valid_until != null && { valid_until: subscription.valid_until }),
            ...(subscription.created_at != null && { created_at: subscription.created_at }),
            ...(subscription.stage_slug != null && { stage_slug: subscription.stage_slug }),
            ...(subscription.job_shortcode != null && { job_shortcode: subscription.job_shortcode })
        }));

        if (subscriptions.length > 0) {
            await nango.batchSave(subscriptions, 'Subscription');
        }

        await nango.trackDeletesEnd('Subscription');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
