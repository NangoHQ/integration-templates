import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

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
    outcome: z.string().optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    dispute_flow: z.string().optional()
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
    outcome: z.string().optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    dispute_flow: z.string().optional()
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
        const updatedAfter = checkpoint.updated_after || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.paypal.com/api/customer-disputes/v1/#disputes_list
            endpoint: '/v1/customer/disputes',
            params: {
                ...(updatedAfter && { update_time_after: updatedAfter }),
                page_size: 50
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'page_size',
                limit: 50,
                response_path: 'items'
            },
            retries: 3
        };

        let maxUpdateTime: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

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
                    ...(record.outcome != null && { outcome: record.outcome }),
                    ...(record.dispute_life_cycle_stage != null && {
                        dispute_life_cycle_stage: record.dispute_life_cycle_stage
                    }),
                    ...(record.dispute_channel != null && { dispute_channel: record.dispute_channel }),
                    ...(record.dispute_flow != null && { dispute_flow: record.dispute_flow })
                }));

            if (disputes.length === 0) {
                continue;
            }

            await nango.batchSave(disputes, 'Dispute');

            for (const dispute of disputes) {
                if (maxUpdateTime === undefined || dispute.update_time > maxUpdateTime) {
                    maxUpdateTime = dispute.update_time;
                }
            }
        }

        if (maxUpdateTime !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdateTime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
