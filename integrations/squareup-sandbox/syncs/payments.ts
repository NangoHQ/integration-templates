import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PaymentSchema = z.object({
    id: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    amount_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    total_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    approved_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    source_type: z.string().optional(),
    card_details: z.unknown().optional(),
    processing_fee: z.array(z.unknown()).optional(),
    note: z.string().optional(),
    receipt_number: z.string().optional(),
    receipt_url: z.string().optional(),
    delay_action: z.string().optional(),
    delayed_until: z.string().optional(),
    team_member_id: z.string().optional(),
    employee_id: z.string().optional(),
    version_token: z.string().optional(),
    application_details: z.unknown().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync payments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || '1970-01-01T00:00:00.000Z';
        let cursor = checkpoint.cursor || undefined;
        let lastProcessedUpdatedAt = updatedAfter;

        const params: Record<string, string | number | string[] | number[]> = {
            sort_order: 'ASC',
            sort_field: 'UPDATED_AT',
            updated_at_begin_time: updatedAfter
        };
        if (cursor) {
            params['cursor'] = cursor;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/payments-api/list-payments
            endpoint: '/v2/payments',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'payments',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async (paginationState) => {
                    cursor = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const payments = page.map((item: unknown) => {
                const result = PaymentSchema.safeParse(item);
                if (!result.success) {
                    throw new Error(`Failed to parse payment: ${result.error.message}`);
                }
                const record = result.data;
                return {
                    id: record.id,
                    status: record.status,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    amount_money: record.amount_money,
                    total_money: record.total_money,
                    approved_money: record.approved_money,
                    location_id: record.location_id,
                    order_id: record.order_id,
                    source_type: record.source_type,
                    card_details: record.card_details,
                    processing_fee: record.processing_fee,
                    note: record.note,
                    receipt_number: record.receipt_number,
                    receipt_url: record.receipt_url,
                    delay_action: record.delay_action,
                    delayed_until: record.delayed_until,
                    team_member_id: record.team_member_id,
                    employee_id: record.employee_id,
                    version_token: record.version_token,
                    application_details: record.application_details
                };
            });

            if (payments.length > 0) {
                await nango.batchSave(payments, 'Payment');

                const lastPayment = payments.at(-1);
                if (lastPayment) {
                    lastProcessedUpdatedAt = lastPayment.updated_at;
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
