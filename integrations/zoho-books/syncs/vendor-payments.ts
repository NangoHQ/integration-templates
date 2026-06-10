import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const CheckpointSchema = z.object({
    last_modified_time: z.string()
});

const ProviderVendorPaymentSchema = z.object({
    payment_id: z.string(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_number: z.union([z.string(), z.number()]).optional(),
    date: z.string().optional(),
    reference_number: z.string().optional(),
    amount: z.number().optional(),
    balance: z.number().optional(),
    description: z.string().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const VendorPaymentSchema = z.object({
    id: z.string(),
    payment_id: z.string(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_number: z.string().optional(),
    date: z.string().optional(),
    reference_number: z.string().optional(),
    amount: z.number().optional(),
    balance: z.number().optional(),
    description: z.string().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync vendor payments from Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        VendorPayment: VendorPaymentSchema
    },
    endpoints: [
        // https://www.zoho.com/books/api/v3/vendor-payments/#list-vendor-payments
        {
            path: '/syncs/vendor-payments',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);
        if (!metadata.success) {
            throw new Error(`Invalid metadata: ${metadata.error.message}`);
        }

        if (!metadata.data.organization_id) {
            throw new Error('organization_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { last_modified_time: '' };
        const lastModifiedTime = checkpoint.last_modified_time;
        let maxLastModifiedTime = lastModifiedTime;

        const params: Record<string, string | number> = {
            organization_id: metadata.data.organization_id,
            sort_column: 'date'
        };
        if (lastModifiedTime) {
            params['last_modified_time'] = lastModifiedTime;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/vendor-payments/#list-vendor-payments
            endpoint: '/books/v3/vendorpayments',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'vendorpayments'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected response: vendorpayments page is not an array');
            }

            const parsed = z.array(ProviderVendorPaymentSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse vendor payments: ${parsed.error.message}`);
            }

            const payments = parsed.data.map((record) => ({
                id: record.payment_id,
                payment_id: record.payment_id,
                vendor_id: record.vendor_id,
                vendor_name: record.vendor_name,
                payment_mode: record.payment_mode,
                payment_number: record.payment_number != null ? String(record.payment_number) : undefined,
                date: record.date,
                reference_number: record.reference_number,
                amount: record.amount,
                balance: record.balance,
                description: record.description,
                paid_through_account_id: record.paid_through_account_id,
                paid_through_account_name: record.paid_through_account_name,
                created_time: record.created_time,
                last_modified_time: record.last_modified_time
            }));

            if (payments.length === 0) {
                continue;
            }

            await nango.batchSave(payments, 'VendorPayment');

            for (const payment of payments) {
                if (payment.last_modified_time != null && payment.last_modified_time > maxLastModifiedTime) {
                    maxLastModifiedTime = payment.last_modified_time;
                }
            }
        }

        if (maxLastModifiedTime !== lastModifiedTime) {
            await nango.saveCheckpoint({
                last_modified_time: maxLastModifiedTime
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
