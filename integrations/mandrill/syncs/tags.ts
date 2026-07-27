import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTagSchema = z.object({
    user_id: z.number(),
    tag: z.string(),
    sent: z.number(),
    hard_bounces: z.number(),
    soft_bounces: z.number(),
    rejects: z.number(),
    complaints: z.number(),
    unsubs: z.number(),
    opens: z.number(),
    clicks: z.number(),
    content_reviews: z.number(),
    content_rejections: z.number(),
    reject_resets: z.number(),
    unique_opens: z.number(),
    unique_clicks: z.number(),
    reputation: z.number(),
    confidence: z.number()
});

const TagSchema = z.object({
    id: z.string(),
    user_id: z.number(),
    tag: z.string(),
    sent: z.number(),
    hard_bounces: z.number(),
    soft_bounces: z.number(),
    rejects: z.number(),
    complaints: z.number(),
    unsubs: z.number(),
    opens: z.number(),
    clicks: z.number(),
    content_reviews: z.number(),
    content_rejections: z.number(),
    reject_resets: z.number(),
    unique_opens: z.number(),
    unique_clicks: z.number(),
    reputation: z.number(),
    confidence: z.number()
});

const sync = createSync({
    description: 'Sync all user-defined tags and their aggregate stats',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // https://mailchimp.com/developer/transactional/api/tags/list-tags/
        const response = await nango.post({
            endpoint: '1.0/tags/list',
            retries: 3
        });

        const parsed = z.array(ProviderTagSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse tags response: ${parsed.error.message}`);
        }

        const tags = parsed.data.map((record) => ({
            id: record.tag,
            user_id: record.user_id,
            tag: record.tag,
            sent: record.sent,
            hard_bounces: record.hard_bounces,
            soft_bounces: record.soft_bounces,
            rejects: record.rejects,
            complaints: record.complaints,
            unsubs: record.unsubs,
            opens: record.opens,
            clicks: record.clicks,
            content_reviews: record.content_reviews,
            content_rejections: record.content_rejections,
            reject_resets: record.reject_resets,
            unique_opens: record.unique_opens,
            unique_clicks: record.unique_clicks,
            reputation: record.reputation,
            confidence: record.confidence
        }));

        await nango.trackDeletesStart('Tag');
        if (tags.length > 0) {
            await nango.batchSave(tags, 'Tag');
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
