import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    start_date: z.string(),
    page: z.number().int().positive()
});

const TransactionSchema = z.object({
    id: z.string(),
    transaction_id: z.string(),
    paypal_account_id: z.string().optional(),
    transaction_event_code: z.string().optional(),
    transaction_initiation_date: z.string().optional(),
    transaction_updated_date: z.string().optional(),
    transaction_amount_currency_code: z.string().optional(),
    transaction_amount_value: z.string().optional(),
    fee_amount_currency_code: z.string().optional(),
    fee_amount_value: z.string().optional(),
    transaction_status: z.string().optional(),
    transaction_subject: z.string().optional(),
    invoice_id: z.string().optional(),
    custom_field: z.string().optional(),
    protection_eligibility: z.string().optional(),
    instrument_type: z.string().optional()
});

const TransactionInfoSchema = z.object({
    paypal_account_id: z.string().optional(),
    transaction_id: z.string(),
    transaction_event_code: z.string().optional(),
    transaction_initiation_date: z.string().optional(),
    transaction_updated_date: z.string().optional(),
    transaction_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    fee_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    transaction_status: z.string().optional(),
    transaction_subject: z.string().optional(),
    invoice_id: z.string().optional(),
    custom_field: z.string().optional(),
    protection_eligibility: z.string().optional(),
    instrument_type: z.string().optional()
});

const TransactionDetailSchema = z.object({
    transaction_info: TransactionInfoSchema.optional()
});

const sync = createSync({
    description: 'Sync transactions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { start_date: '', page: 1 };

        let startDate = checkpoint.start_date || undefined;
        let page = checkpoint.page;

        const nowDate = new Date();
        nowDate.setUTCMinutes(0, 0, 0);
        const now = nowDate.getTime();

        if (!startDate) {
            const defaultStart = new Date(nowDate);
            defaultStart.setUTCDate(defaultStart.getUTCDate() - 90);
            startDate = defaultStart.toISOString();
        }

        const maxWindowMs = 31 * 24 * 60 * 60 * 1000;

        while (true) {
            const startMs = new Date(startDate).getTime();
            const endMs = Math.min(startMs + maxWindowMs, now);
            const endDate = new Date(endMs).toISOString();

            if (startMs >= endMs) {
                break;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developer.paypal.com/docs/api/transaction-search/v1/
                endpoint: '/v1/reporting/transactions',
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    page_size: 100,
                    ...(page > 1 ? { page } : {})
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: page,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    response_path: 'transaction_details',
                    on_page: async ({ nextPageParam }) => {
                        page = typeof nextPageParam === 'number' ? nextPageParam : 1;
                    }
                },
                retries: 3
            };

            for await (const batch of nango.paginate(proxyConfig)) {
                if (!Array.isArray(batch)) {
                    continue;
                }

                const transactions: z.infer<typeof TransactionSchema>[] = [];

                for (const detail of batch) {
                    const parsed = TransactionDetailSchema.safeParse(detail);
                    if (!parsed.success) {
                        continue;
                    }

                    const info = parsed.data.transaction_info;
                    if (!info) {
                        continue;
                    }

                    const idParts = [info.transaction_id, info.transaction_initiation_date].filter((part): part is string => part !== undefined);
                    const id = idParts.join('_');

                    transactions.push({
                        id,
                        transaction_id: info.transaction_id,
                        ...(info.paypal_account_id !== undefined && { paypal_account_id: info.paypal_account_id }),
                        ...(info.transaction_event_code !== undefined && { transaction_event_code: info.transaction_event_code }),
                        ...(info.transaction_initiation_date !== undefined && { transaction_initiation_date: info.transaction_initiation_date }),
                        ...(info.transaction_updated_date !== undefined && { transaction_updated_date: info.transaction_updated_date }),
                        ...(info.transaction_amount?.currency_code !== undefined && {
                            transaction_amount_currency_code: info.transaction_amount.currency_code
                        }),
                        ...(info.transaction_amount?.value !== undefined && { transaction_amount_value: info.transaction_amount.value }),
                        ...(info.fee_amount?.currency_code !== undefined && { fee_amount_currency_code: info.fee_amount.currency_code }),
                        ...(info.fee_amount?.value !== undefined && { fee_amount_value: info.fee_amount.value }),
                        ...(info.transaction_status !== undefined && { transaction_status: info.transaction_status }),
                        ...(info.transaction_subject !== undefined && { transaction_subject: info.transaction_subject }),
                        ...(info.invoice_id !== undefined && { invoice_id: info.invoice_id }),
                        ...(info.custom_field !== undefined && { custom_field: info.custom_field }),
                        ...(info.protection_eligibility !== undefined && { protection_eligibility: info.protection_eligibility }),
                        ...(info.instrument_type !== undefined && { instrument_type: info.instrument_type })
                    });
                }

                if (transactions.length > 0) {
                    await nango.batchSave(transactions, 'Transaction');
                }

                await nango.saveCheckpoint({
                    start_date: startDate,
                    page
                });
            }

            startDate = endDate;
            page = 1;

            if (endMs >= now) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
