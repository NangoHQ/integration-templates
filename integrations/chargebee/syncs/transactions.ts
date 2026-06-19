import { createSync } from 'nango';
import { z } from 'zod';

const TransactionSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    subscription_id: z.string().optional(),
    gateway_account_id: z.string().optional(),
    payment_source_id: z.string().optional(),
    payment_method: z.string().optional(),
    reference_number: z.string().optional(),
    gateway: z.string().optional(),
    type: z.string(),
    date: z.number().optional(),
    settled_at: z.number().optional(),
    exchange_rate: z.number().optional(),
    currency_code: z.string(),
    amount: z.number().optional(),
    id_at_gateway: z.string().optional(),
    status: z.string().optional(),
    fraud_flag: z.string().optional(),
    initiator_type: z.string().optional(),
    three_d_secure: z.boolean().optional(),
    authorization_reason: z.string().optional(),
    error_code: z.string().optional(),
    error_text: z.string().optional(),
    voided_at: z.number().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    fraud_reason: z.string().optional(),
    custom_payment_method_id: z.string().optional(),
    amount_unused: z.number().optional(),
    masked_card_number: z.string().optional(),
    reference_transaction_id: z.string().optional(),
    refunded_txn_id: z.string().optional(),
    reference_authorization_id: z.string().optional(),
    amount_capturable: z.number().optional(),
    reversal_transaction_id: z.string().optional(),
    deleted: z.boolean(),
    iin: z.string().optional(),
    last4: z.string().optional(),
    merchant_reference_id: z.string().optional(),
    business_entity_id: z.string().optional(),
    payment_method_details: z.string().optional(),
    custom_payment_method_name: z.string().optional(),
    linked_invoices: z.unknown().optional(),
    linked_credit_notes: z.unknown().optional(),
    linked_refunds: z.unknown().optional(),
    linked_payments: z.unknown().optional(),
    error_detail: z.unknown().optional()
});

const ListItemSchema = z.object({
    transaction: TransactionSchema
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync transactions incrementally using updated_at timestamp filter.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint && typeof checkpoint['updated_after'] === 'number' ? checkpoint['updated_after'] : undefined;

        let lastProcessedUpdatedAt: number | undefined;

        // https://apidocs.chargebee.com/docs/api/transactions/list-transactions
        for await (const page of nango.paginate({
            endpoint: '/api/v2/transactions',
            params: {
                'sort_by[asc]': 'updated_at',
                ...(updatedAfter !== undefined && { 'updated_at[after]': updatedAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array from response_path=list');
            }

            const transactions = [];
            for (const item of page) {
                const parsed = ListItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid transaction list item: ${parsed.error.message}`);
                }
                transactions.push(parsed.data.transaction);
            }

            if (transactions.length === 0) {
                continue;
            }

            await nango.batchSave(transactions, 'Transaction');

            const lastTransaction = transactions[transactions.length - 1];
            if (lastTransaction === undefined) {
                continue;
            }
            const lastUpdatedAt = lastTransaction['updated_at'];
            if (lastUpdatedAt !== undefined) {
                lastProcessedUpdatedAt = lastUpdatedAt;
            }

            if (lastProcessedUpdatedAt !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: lastProcessedUpdatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
