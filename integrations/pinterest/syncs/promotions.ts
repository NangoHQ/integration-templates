import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AdAccountSchema = z.object({
    id: z.string()
});

const PromotionSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    discount_status: z.string().optional(),
    end_time: z.number().optional(),
    external_id: z.string().optional(),
    platform_type: z.string().optional(),
    promotion_code: z.string().optional(),
    promotion_custom_id: z.string().optional(),
    promotion_title: z.string(),
    promotion_type: z.string(),
    start_time: z.number().optional(),
    status: z.string().optional(),
    template_values: z
        .array(
            z.object({
                amount: z.number().optional(),
                currency_code: z.string().optional(),
                custom_text: z.string().optional(),
                percent: z.number().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync Shopping ad promotions',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Promotion: PromotionSchema
    },

    exec: async (nango) => {
        const adAccounts: Array<{ id: string }> = [];
        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const item of page) {
                const parsed = AdAccountSchema.parse(item);
                adAccounts.push(parsed);
            }
        }

        // Promotions can be hard-deleted, so each successful run must recrawl from page 1
        // for delete tracking to stay correct.
        await nango.trackDeletesStart('Promotion');

        for (const adAccount of adAccounts) {
            const promotionProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#operation/promotions/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccount.id)}/promotions`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(promotionProxyConfig)) {
                const promotions = [];
                for (const item of page) {
                    const parsed = PromotionSchema.parse(item);
                    promotions.push({
                        id: parsed.id,
                        ad_account_id: parsed.ad_account_id,
                        discount_status: parsed.discount_status,
                        end_time: parsed.end_time,
                        external_id: parsed.external_id,
                        platform_type: parsed.platform_type,
                        promotion_code: parsed.promotion_code,
                        promotion_custom_id: parsed.promotion_custom_id,
                        promotion_title: parsed.promotion_title,
                        promotion_type: parsed.promotion_type,
                        start_time: parsed.start_time,
                        status: parsed.status,
                        template_values: parsed.template_values
                    });
                }

                if (promotions.length > 0) {
                    await nango.batchSave(promotions, 'Promotion');
                }
            }
        }

        await nango.trackDeletesEnd('Promotion');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
