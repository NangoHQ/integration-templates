import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawInvoiceSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        customer_id: z.string(),
        subscription_id: z.string().optional(),
        status: z.string(),
        date: z.number().optional(),
        due_date: z.number().optional(),
        net_term_days: z.number().optional(),
        po_number: z.string().optional(),
        vat_number: z.string().optional(),
        price_type: z.string().optional(),
        exchange_rate: z.number().optional(),
        currency_code: z.string(),
        tax: z.number().optional(),
        sub_total: z.number().optional(),
        total: z.number().optional(),
        amount_due: z.number().optional(),
        amount_paid: z.number().optional(),
        paid_at: z.number().optional(),
        voided_at: z.number().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        deleted: z.boolean(),
        recurring: z.boolean().optional(),
        first_invoice: z.boolean().optional(),
        has_advance_charges: z.boolean().optional(),
        term_finalized: z.boolean().optional(),
        is_gifted: z.boolean().optional(),
        generated_at: z.number().optional(),
        amount_adjusted: z.number().optional(),
        write_off_amount: z.number().optional(),
        credits_applied: z.number().optional(),
        round_off_amount: z.number().optional(),
        amount_to_collect: z.number().optional(),
        dunning_status: z.string().optional(),
        next_retry_at: z.number().optional(),
        void_reason_code: z.string().optional(),
        tax_category: z.string().optional(),
        vat_number_prefix: z.string().optional(),
        channel: z.string().optional(),
        business_entity_id: z.string().optional(),
        local_currency_code: z.string().optional(),
        local_currency_exchange_rate: z.number().optional(),
        sub_total_in_local_currency: z.number().optional(),
        total_in_local_currency: z.number().optional()
    })
    .passthrough();

const InvoiceSchema = z
    .object({
        id: z.string(),
        customer_id: z.string(),
        subscription_id: z.string().optional(),
        status: z.string(),
        date: z.number().optional(),
        due_date: z.number().optional(),
        net_term_days: z.number().optional(),
        po_number: z.string().optional(),
        vat_number: z.string().optional(),
        price_type: z.string().optional(),
        exchange_rate: z.number().optional(),
        currency_code: z.string(),
        tax: z.number().optional(),
        sub_total: z.number().optional(),
        total: z.number().optional(),
        amount_due: z.number().optional(),
        amount_paid: z.number().optional(),
        paid_at: z.number().optional(),
        voided_at: z.number().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        deleted: z.boolean(),
        recurring: z.boolean().optional(),
        first_invoice: z.boolean().optional(),
        has_advance_charges: z.boolean().optional(),
        term_finalized: z.boolean().optional(),
        is_gifted: z.boolean().optional(),
        generated_at: z.number().optional(),
        amount_adjusted: z.number().optional(),
        write_off_amount: z.number().optional(),
        credits_applied: z.number().optional(),
        round_off_amount: z.number().optional(),
        amount_to_collect: z.number().optional(),
        dunning_status: z.string().optional(),
        next_retry_at: z.number().optional(),
        void_reason_code: z.string().optional(),
        tax_category: z.string().optional(),
        vat_number_prefix: z.string().optional(),
        channel: z.string().optional(),
        business_entity_id: z.string().optional(),
        local_currency_code: z.string().optional(),
        local_currency_exchange_rate: z.number().optional(),
        sub_total_in_local_currency: z.number().optional(),
        total_in_local_currency: z.number().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const sync = createSync({
    description: 'Sync invoices incrementally using updated_at timestamp filter.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let updatedAfter: number | undefined;
        if (rawCheckpoint) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            updatedAfter = checkpointResult.data.updated_after;
        }

        const params: Record<string, string | number> = {
            'sort_by[asc]': 'updated_at'
        };
        if (updatedAfter !== undefined) {
            params['updated_at[after]'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/invoices
            endpoint: '/api/v2/invoices',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = page.map((item: unknown) => {
                const wrapper = z.object({ invoice: z.unknown() }).safeParse(item);
                if (!wrapper.success) {
                    throw new Error('Invalid invoice list item: missing invoice wrapper');
                }
                const invoiceResult = RawInvoiceSchema.safeParse(wrapper.data.invoice);
                if (!invoiceResult.success) {
                    throw new Error(`Invalid invoice object: ${invoiceResult.error.message}`);
                }
                return invoiceResult.data;
            });

            if (items.length === 0) {
                continue;
            }

            const records = items.map((invoice) => {
                const { id, ...rest } = invoice;
                return {
                    id: String(id),
                    ...rest
                };
            });

            await nango.batchSave(records, 'Invoice');

            const lastItem = items[items.length - 1];
            if (lastItem && lastItem.updated_at !== undefined) {
                await nango.saveCheckpoint({ updated_after: lastItem.updated_at });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
