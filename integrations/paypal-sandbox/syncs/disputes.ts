import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Note: PayPal's dispute list response (dispute_info) does not include an `outcome`/`dispute_flow` field at
// all (those only ever appeared as always-undefined dead fields here); it does include buyer/seller response
// due dates, which are modeled below instead.
const DisputeSchema = z.object({
    id: z.string(),
    dispute_id: z.string(),
    create_time: z.string(),
    update_time: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    dispute_state: z.string().optional(),
    dispute_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    buyer_response_due_date: z.string().optional(),
    seller_response_due_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderDisputeSchema = z.object({
    dispute_id: z.string(),
    create_time: z.string(),
    update_time: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    dispute_state: z.string().optional(),
    dispute_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    buyer_response_due_date: z.string().optional(),
    seller_response_due_date: z.string().optional()
});

const sync = createSync({
    description: 'Sync disputes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Dispute: DisputeSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { updated_after: '' });
        if (!checkpointResult.success) {
            throw new Error('Invalid checkpoint: ' + checkpointResult.error.message);
        }
        const checkpoint = checkpointResult.data;

        // PayPal caps this endpoint at page 50 (page_size up to 50), so a single `update_time_after` filter
        // value can only ever retrieve 2,500 disputes before pagination itself fails with an unsupported page.
        // For accounts with more disputes updated since the watermark than that in one run, we advance
        // `update_time_after` to the max update_time seen so far and restart from page 1, instead of requesting
        // page 51.
        const PAGE_SIZE = 50;
        const MAX_PAGE = 50;

        let updatedAfter = checkpoint.updated_after || undefined;
        let overallMaxUpdateTime: string | undefined;

        for (;;) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.paypal.com/api/customer-disputes/v1/#disputes_list
                endpoint: '/v1/customer/disputes',
                params: {
                    ...(updatedAfter && { update_time_after: updatedAfter }),
                    page_size: PAGE_SIZE
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_calculation_method: 'per-page',
                    offset_start_value: 1,
                    limit_name_in_request: 'page_size',
                    limit: PAGE_SIZE,
                    response_path: 'items'
                },
                retries: 3
            };

            let windowMaxUpdateTime: string | undefined;
            let pageNumber = 0;
            let hitPageCap = false;

            for await (const page of nango.paginate(proxyConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Expected page to be an array');
                }
                pageNumber++;

                const disputes = page
                    .map((item) => {
                        const parsed = ProviderDisputeSchema.safeParse(item);
                        if (!parsed.success) {
                            throw new Error('Failed to parse dispute: ' + parsed.error.message);
                        }
                        return parsed.data;
                    })
                    .map((record) => ({
                        id: record.dispute_id,
                        dispute_id: record.dispute_id,
                        create_time: record.create_time,
                        update_time: record.update_time,
                        ...(record.reason != null && { reason: record.reason }),
                        ...(record.status != null && { status: record.status }),
                        ...(record.dispute_state != null && { dispute_state: record.dispute_state }),
                        ...(record.dispute_amount != null && {
                            dispute_amount: {
                                ...(record.dispute_amount.currency_code != null && {
                                    currency_code: record.dispute_amount.currency_code
                                }),
                                ...(record.dispute_amount.value != null && {
                                    value: record.dispute_amount.value
                                })
                            }
                        }),
                        ...(record.dispute_life_cycle_stage != null && {
                            dispute_life_cycle_stage: record.dispute_life_cycle_stage
                        }),
                        ...(record.dispute_channel != null && { dispute_channel: record.dispute_channel }),
                        ...(record.buyer_response_due_date != null && { buyer_response_due_date: record.buyer_response_due_date }),
                        ...(record.seller_response_due_date != null && { seller_response_due_date: record.seller_response_due_date })
                    }));

                if (disputes.length > 0) {
                    await nango.batchSave(disputes, 'Dispute');
                }

                for (const dispute of disputes) {
                    if (windowMaxUpdateTime === undefined || dispute.update_time > windowMaxUpdateTime) {
                        windowMaxUpdateTime = dispute.update_time;
                    }
                }

                if (pageNumber >= MAX_PAGE && page.length === PAGE_SIZE) {
                    // A full page 50 means there could be more results PayPal can't paginate to; stop here and
                    // restart the window instead of requesting the unsupported page 51.
                    hitPageCap = true;
                    break;
                }
            }

            if (windowMaxUpdateTime !== undefined && (overallMaxUpdateTime === undefined || windowMaxUpdateTime > overallMaxUpdateTime)) {
                overallMaxUpdateTime = windowMaxUpdateTime;
            }

            if (hitPageCap && windowMaxUpdateTime !== undefined) {
                updatedAfter = windowMaxUpdateTime;
                continue;
            }

            break;
        }

        if (overallMaxUpdateTime !== undefined) {
            // Persist a watermark 1 second before the true max so disputes sharing that exact timestamp (which
            // would otherwise be excluded by the strict "after" filter on the next run) are re-fetched. Safe
            // because batchSave upserts by id.
            const overlapSafeWatermark = new Date(new Date(overallMaxUpdateTime).getTime() - 1000).toISOString();
            await nango.saveCheckpoint({ updated_after: overlapSafeWatermark });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
