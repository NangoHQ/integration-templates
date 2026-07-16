import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const RefundSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount_money: MoneySchema.optional(),
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    location_id: z.string().optional(),
    reason: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync refunds.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Refund: RefundSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || '1970-01-01T00:00:00.000Z';
        let cursor = checkpoint.cursor || undefined;
        let lastProcessedUpdatedAt = updatedAfter;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds
            endpoint: '/v2/refunds',
            params: {
                updated_at_begin_time: updatedAfter,
                sort_order: 'ASC',
                sort_field: 'UPDATED_AT',
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'refunds',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async (paginationState) => {
                    cursor = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const refunds of nango.paginate(proxyConfig)) {
            const validRefunds = z.array(RefundSchema).safeParse(refunds);
            if (!validRefunds.success) {
                throw new Error(`Invalid refund data: ${validRefunds.error.message}`);
            }

            if (validRefunds.data.length > 0) {
                await nango.batchSave(validRefunds.data, 'Refund');

                const lastRefund = validRefunds.data[validRefunds.data.length - 1];
                if (lastRefund) {
                    lastProcessedUpdatedAt = lastRefund.updated_at ?? lastRefund.created_at ?? lastProcessedUpdatedAt;
                }
            }

            if (cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor
                });
            }
        }

        await nango.saveCheckpoint({ updated_after: lastProcessedUpdatedAt, cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
