import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRefundSchema = z.object({
    id: z.number().int(),
    parent_id: z.number().int().optional(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    amount: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
    refunded_by: z.number().int().optional().nullable(),
    refunded_payment: z.boolean().optional().nullable(),
    meta_data: z.array(z.unknown()).optional(),
    line_items: z.array(z.unknown()).optional(),
    tax_lines: z.array(z.unknown()).optional(),
    shipping_lines: z.array(z.unknown()).optional(),
    fee_lines: z.array(z.unknown()).optional()
});

const RefundSchema = z.object({
    id: z.string(),
    order_id: z.string(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    amount: z.string().optional(),
    reason: z.string().optional(),
    refunded_by: z.number().int().optional(),
    refunded_payment: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync refunds from WooCommerce.',
    version: '1.0.0',
    // https://woocommerce.github.io/woocommerce-rest-api-docs/#refunds
    endpoints: [{ method: 'GET', path: '/syncs/refunds' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Refund: RefundSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#refunds
            endpoint: '/wp-json/wc/v3/refunds',
            params: {
                orderby: 'date',
                order: 'asc',
                ...(updatedAfter !== undefined && { after: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const refunds = z
                .array(ProviderRefundSchema)
                .parse(page)
                .map((refund) => {
                    const mapped: {
                        id: string;
                        order_id: string;
                        date_created: string;
                        date_created_gmt: string;
                        amount?: string;
                        reason?: string;
                        refunded_by?: number;
                        refunded_payment?: boolean;
                    } = {
                        id: String(refund.id),
                        order_id: String(refund.parent_id ?? ''),
                        date_created: refund.date_created,
                        date_created_gmt: refund.date_created_gmt
                    };

                    if (refund.amount !== null && refund.amount !== undefined) {
                        mapped.amount = refund.amount;
                    }
                    if (refund.reason !== null && refund.reason !== undefined) {
                        mapped.reason = refund.reason;
                    }
                    if (refund.refunded_by !== null && refund.refunded_by !== undefined) {
                        mapped.refunded_by = refund.refunded_by;
                    }
                    if (refund.refunded_payment !== null && refund.refunded_payment !== undefined) {
                        mapped.refunded_payment = refund.refunded_payment;
                    }

                    return mapped;
                });

            if (refunds.length === 0) {
                continue;
            }

            await nango.batchSave(refunds, 'Refund');

            const lastRefund = refunds.at(-1);
            if (lastRefund !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: lastRefund.date_created_gmt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
