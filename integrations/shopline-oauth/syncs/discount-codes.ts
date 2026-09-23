import { createSync } from 'nango';
import { z } from 'zod';

// Internal provider schema for price rule list responses (descriptions not required).
const ProviderPriceRuleListSchema = z
    .object({
        price_rules: z.array(
            z
                .object({
                    id: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();

// Public model schema for synced discount codes.
const DiscountCodeSchema = z
    .object({
        id: z.string().describe('Unique identifier for the discount code.'),
        price_rule_id: z.string().describe('The ID of the parent price rule this discount code belongs to.'),
        code: z.string().describe('The redeemable code string customers enter at checkout.'),
        usage_count: z.number().describe('Number of times this code has been used.'),
        create_at: z.string().describe('ISO 8601 timestamp when the discount code was created.'),
        update_at: z.string().describe('ISO 8601 timestamp when the discount code was last updated.')
    })
    .describe('A redeemable discount code string scoped to a parent price rule.');

// Internal provider schema for discount code list responses.
const ProviderDiscountCodeListSchema = z
    .object({
        discount_codes: z.array(
            z
                .object({
                    id: z.string(),
                    price_rule_id: z.string(),
                    code: z.string(),
                    usage_count: z.number(),
                    create_at: z.string(),
                    update_at: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();

// Checkpoint must be a flat record of string|number|boolean values (no optional, no arrays).
const CheckpointSchema = z.object({
    outer_page_info: z.string(),
    current_price_rule_id: z.string(),
    inner_page_info: z.string()
});

const sync = createSync({
    description: 'Sync discount codes (the redeemable code strings), scoped per price rule.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DiscountCode: DiscountCodeSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let outerPageInfo = checkpoint?.outer_page_info ?? '';
        let currentPriceRuleId = checkpoint?.current_price_rule_id ?? '';
        let innerPageInfo = checkpoint?.inner_page_info ?? '';

        await nango.trackDeletesStart('DiscountCode');

        // Outer crawl: fetch price rules page by page.
        while (true) {
            const response = await nango.get<unknown>({
                // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rules/get-price-rules
                endpoint: '/admin/openapi/v20260601/sales/price_rules.json',
                params: {
                    limit: 100,
                    ...(outerPageInfo && { page_info: outerPageInfo })
                },
                retries: 3
            });

            const parsed = ProviderPriceRuleListSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid price rules list response: ${parsed.error.message}`);
            }

            const priceRules = parsed.data.price_rules;

            // Resume within a page if we have a partially processed price rule.
            let resumeIndex = 0;
            if (currentPriceRuleId !== '') {
                const foundIndex = priceRules.findIndex((pr) => pr.id === currentPriceRuleId);
                if (foundIndex !== -1) {
                    resumeIndex = foundIndex;
                } else {
                    // The saved price rule no longer appears on this page (deleted, or the
                    // page contents shifted). Reprocess the current page from its first rule
                    // instead of jumping to the next page, so no rule is silently skipped.
                    resumeIndex = 0;
                    currentPriceRuleId = '';
                    innerPageInfo = '';
                }
            }

            for (let i = resumeIndex; i < priceRules.length; i++) {
                const priceRuleId = priceRules[i]?.id;
                if (!priceRuleId) {
                    throw new Error('Invalid price rule id in response.');
                }

                currentPriceRuleId = priceRuleId;
                innerPageInfo = '';
                await nango.saveCheckpoint({
                    outer_page_info: outerPageInfo,
                    current_price_rule_id: currentPriceRuleId,
                    inner_page_info: ''
                });

                // Inner crawl: fetch all discount codes for the current price rule.
                while (true) {
                    const discountResponse = await nango.get<unknown>({
                        // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rules/discount-codes/get-discount-codes-for-price-rule
                        endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(priceRuleId)}/discount_codes.json`,
                        params: {
                            limit: 100,
                            ...(innerPageInfo && { page_info: innerPageInfo })
                        },
                        retries: 3
                    });

                    const discountParsed = ProviderDiscountCodeListSchema.safeParse(discountResponse.data);
                    if (!discountParsed.success) {
                        throw new Error(`Invalid discount codes list response: ${discountParsed.error.message}`);
                    }

                    const discountCodes = discountParsed.data.discount_codes;
                    if (discountCodes.length > 0) {
                        await nango.batchSave(discountCodes, 'DiscountCode');
                    }

                    const linkHeader = discountResponse.headers['link'];
                    let nextPageInfo = '';
                    if (typeof linkHeader === 'string') {
                        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                        if (match && match[1]) {
                            // @allowTryCatch Malformed Link header URLs should not crash the sync; default to no next page.
                            try {
                                nextPageInfo = new URL(match[1]).searchParams.get('page_info') || '';
                            } catch {
                                nextPageInfo = '';
                            }
                        }
                    }

                    await nango.saveCheckpoint({
                        outer_page_info: outerPageInfo,
                        current_price_rule_id: currentPriceRuleId,
                        inner_page_info: nextPageInfo
                    });

                    if (nextPageInfo === '') {
                        break;
                    }
                    innerPageInfo = nextPageInfo;
                }

                // Finished this price rule; clear its cursor before moving on.
                currentPriceRuleId = '';
                innerPageInfo = '';
                await nango.saveCheckpoint({
                    outer_page_info: outerPageInfo,
                    current_price_rule_id: '',
                    inner_page_info: ''
                });
            }

            // Move to the next page of price rules.
            const linkHeader = response.headers['link'];
            let nextPageInfo = '';
            if (typeof linkHeader === 'string') {
                const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                if (match && match[1]) {
                    // @allowTryCatch Malformed Link header URLs should not crash the sync; default to no next page.
                    try {
                        nextPageInfo = new URL(match[1]).searchParams.get('page_info') || '';
                    } catch {
                        nextPageInfo = '';
                    }
                }
            }

            await nango.saveCheckpoint({
                outer_page_info: nextPageInfo,
                current_price_rule_id: '',
                inner_page_info: ''
            });

            if (nextPageInfo === '') {
                break;
            }

            outerPageInfo = nextPageInfo;
            currentPriceRuleId = '';
            innerPageInfo = '';
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DiscountCode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
