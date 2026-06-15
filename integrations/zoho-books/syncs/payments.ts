import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().optional(),
    invoice_numbers: z.string().optional(),
    date: z.string().optional(),
    payment_mode: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    unused_amount: z.number().optional(),
    bcy_unused_amount: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    bcy_refunded_amount: z.number().optional(),
    payment_type: z.string().optional(),
    payment_status: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional()
});

const PaymentSchema = z.object({
    id: z.string(),
    payment_id: z.string().optional(),
    payment_number: z.string().optional(),
    invoice_numbers: z.string().optional(),
    date: z.string().optional(),
    payment_mode: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    unused_amount: z.number().optional(),
    bcy_unused_amount: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    bcy_refunded_amount: z.number().optional(),
    payment_type: z.string().optional(),
    payment_status: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const sync = createSync({
    description: 'Sync customer payments from Zoho Books',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Payment: PaymentSchema
    },
    endpoints: [
        {
            path: '/syncs/payments',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('organization_id is required in metadata');
        }
        const organizationId = parsedMetadata.data.organization_id;

        // Blocker: List Customer Payments documents pagination and filters, but no
        // last_modified_time filter or equivalent incremental cursor.
        await nango.trackDeletesStart('Payment');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/customer-payments/#list-customer-payments
            endpoint: '/books/v3/customerpayments',
            params: {
                organization_id: organizationId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'customerpayments'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawPage = z.array(z.unknown()).safeParse(page);
            if (!rawPage.success) {
                throw new Error('Invalid page data from paginate');
            }

            const payments: Array<z.infer<typeof PaymentSchema>> = [];
            for (const record of rawPage.data) {
                const parsedRecord = ProviderPaymentSchema.safeParse(record);
                if (!parsedRecord.success) {
                    throw new Error('Invalid customer payment record');
                }

                const r = parsedRecord.data;
                payments.push({
                    id: r.payment_id,
                    ...(r.payment_id !== undefined && { payment_id: r.payment_id }),
                    ...(r.payment_number !== undefined && { payment_number: r.payment_number }),
                    ...(r.invoice_numbers !== undefined && { invoice_numbers: r.invoice_numbers }),
                    ...(r.date !== undefined && { date: r.date }),
                    ...(r.payment_mode !== undefined && { payment_mode: r.payment_mode }),
                    ...(r.amount !== undefined && { amount: r.amount }),
                    ...(r.bcy_amount !== undefined && { bcy_amount: r.bcy_amount }),
                    ...(r.unused_amount !== undefined && { unused_amount: r.unused_amount }),
                    ...(r.bcy_unused_amount !== undefined && { bcy_unused_amount: r.bcy_unused_amount }),
                    ...(r.account_id !== undefined && { account_id: r.account_id }),
                    ...(r.account_name !== undefined && { account_name: r.account_name }),
                    ...(r.description !== undefined && { description: r.description }),
                    ...(r.reference_number !== undefined && { reference_number: r.reference_number }),
                    ...(r.customer_id !== undefined && { customer_id: r.customer_id }),
                    ...(r.customer_name !== undefined && { customer_name: r.customer_name }),
                    ...(r.created_time !== undefined && { created_time: r.created_time }),
                    ...(r.last_modified_time !== undefined && { last_modified_time: r.last_modified_time }),
                    ...(r.bcy_refunded_amount !== undefined && { bcy_refunded_amount: r.bcy_refunded_amount }),
                    ...(r.payment_type !== undefined && { payment_type: r.payment_type }),
                    ...(r.payment_status !== undefined && { payment_status: r.payment_status }),
                    ...(r.currency_code !== undefined && { currency_code: r.currency_code }),
                    ...(r.currency_symbol !== undefined && { currency_symbol: r.currency_symbol }),
                    ...(r.location_id !== undefined && { location_id: r.location_id }),
                    ...(r.location_name !== undefined && { location_name: r.location_name })
                });
            }

            if (payments.length === 0) {
                continue;
            }

            await nango.batchSave(payments, 'Payment');
        }

        await nango.trackDeletesEnd('Payment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
