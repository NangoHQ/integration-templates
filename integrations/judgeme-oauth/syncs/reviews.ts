import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const ReviewSchema = z
    .object({
        id: z.string().describe('Unique identifier for the review.'),
        title: z.string().optional().describe('Title of the review.'),
        body: z.string().optional().describe('Body text of the review.'),
        rating: z.number().optional().describe('Star rating from 1 to 5.'),
        pinned: z.boolean().optional().describe('Whether the review is pinned to the top of the product page.'),
        product_external_id: z.number().optional().describe('External (platform) identifier of the reviewed product.'),
        product_title: z.string().optional().describe('Title of the reviewed product.'),
        product_handle: z.string().optional().describe('URL handle of the reviewed product.'),
        reviewer_id: z.number().optional().describe('Judge.me internal identifier of the reviewer.'),
        reviewer_name: z.string().optional().describe('Name of the reviewer.'),
        reviewer_email: z.string().optional().describe('Email address of the reviewer.'),
        source: z.string().optional().describe('Source channel where the review was submitted.'),
        published: z.boolean().optional().describe('Whether the review is published and visible.'),
        hidden: z.boolean().optional().describe('Whether the review is hidden from public display.'),
        verified: z.boolean().optional().describe('Whether the review is from a verified purchase.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the review was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the review was last updated.'),
        published_at: z.string().optional().describe('ISO 8601 timestamp when the review was published.'),
        ip_address: z.string().optional().describe('IP address from which the review was submitted.'),
        pictures: z.array(z.string()).optional().describe('URLs of pictures attached to the review.')
    })
    .describe('A product or shop review left by a customer.');

const ProviderReviewerSchema = z.object({
    id: z.number(),
    email: z.string().nullish(),
    name: z.string().nullish(),
    phone: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    accepts_marketing: z.union([z.boolean(), z.string()]).nullish(),
    unsubscribed_at: z.string().nullish(),
    external_id: z.union([z.number(), z.string()]).nullish()
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    title: z.string().nullish(),
    body: z.string().nullish(),
    rating: z.union([z.number(), z.string()]).nullish(),
    pinned: z.union([z.boolean(), z.string()]).nullish(),
    product_external_id: z.union([z.number(), z.string()]).nullish(),
    product_title: z.string().nullish(),
    product_handle: z.string().nullish(),
    reviewer: ProviderReviewerSchema.nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    published_at: z.string().nullish(),
    source: z.string().nullish(),
    verified: z.union([z.boolean(), z.string()]).nullish(),
    hidden: z.union([z.boolean(), z.string()]).nullish(),
    published: z.union([z.boolean(), z.string()]).nullish(),
    ip_address: z.string().nullish(),
    pictures: z.array(z.string()).nullish()
});

const sync = createSync({
    description: 'Sync all reviews for the shop.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Review: ReviewSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint ?? { page: 1 });
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        // Blocker: provider only exposes /api/v1/reviews with no confirmed changed-since filter.
        // Params like updated_at_min/created_at_min/since_id are silently accepted but could not
        // be proven to actually filter server-side against a store with zero reviews.
        // Default to full refresh with trackDeletesStart()/trackDeletesEnd().
        let currentPage = 1;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Review');

        const proxyConfig: ProxyConfiguration = {
            // https://judge.me/api/docs
            endpoint: '/api/v1/reviews',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: currentPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'reviews',
                on_page: async (pageInfo) => {
                    currentPage = typeof pageInfo.nextPageParam === 'number' ? pageInfo.nextPageParam : 1;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const reviewsBatch: unknown[] = pageResults;
            const reviews = [];

            for (const record of reviewsBatch) {
                const parsed = ProviderReviewSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse review: ${parsed.error.message}`);
                }

                const data = parsed.data;
                const toBoolean = (value: boolean | string | null | undefined) => {
                    if (value === true || value === false) {
                        return value;
                    }
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase();
                        if (lower === 'true') {
                            return true;
                        }
                        if (lower === 'false') {
                            return false;
                        }
                    }
                    return undefined;
                };
                const toNumber = (value: number | string | null | undefined) => {
                    if (typeof value === 'number') {
                        return value;
                    }
                    if (typeof value === 'string') {
                        const parsedValue = Number(value);
                        return Number.isNaN(parsedValue) ? undefined : parsedValue;
                    }
                    return undefined;
                };
                reviews.push({
                    id: String(data.id),
                    title: data.title ?? undefined,
                    body: data.body ?? undefined,
                    rating: toNumber(data.rating),
                    pinned: toBoolean(data.pinned),
                    product_external_id: toNumber(data.product_external_id),
                    product_title: data.product_title ?? undefined,
                    product_handle: data.product_handle ?? undefined,
                    reviewer_id: data.reviewer?.id ?? undefined,
                    reviewer_name: data.reviewer?.name ?? undefined,
                    reviewer_email: data.reviewer?.email ?? undefined,
                    source: data.source ?? undefined,
                    published: toBoolean(data.published),
                    hidden: toBoolean(data.hidden),
                    verified: toBoolean(data.verified),
                    created_at: data.created_at ?? undefined,
                    updated_at: data.updated_at ?? undefined,
                    published_at: data.published_at ?? undefined,
                    ip_address: data.ip_address ?? undefined,
                    pictures: data.pictures ?? undefined
                });
            }

            if (reviews.length > 0) {
                await nango.batchSave(reviews, 'Review');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from page 1 next time instead of
            // resuming where it left off.
            await nango.saveCheckpoint({ page: currentPage });
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Review');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
