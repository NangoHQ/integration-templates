import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBillSchema = z.object({
    bill_id: z.string(),
    vendor_id: z.string().optional().nullable(),
    vendor_name: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    bill_number: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    exchange_rate: z.number().optional().nullable(),
    total: z.number().optional().nullable(),
    balance: z.number().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable()
});

const BillSchema = z.object({
    id: z.string(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    status: z.string().optional(),
    bill_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive(),
    max_last_modified_time: z.string()
});

const sync = createSync({
    description: 'Sync bills from Zoho Books.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/bills' }],
    models: {
        Bill: BillSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updated_after'] : '';
        let page = checkpoint ? checkpoint['page'] : 1;
        let maxLastModifiedTime = checkpoint ? checkpoint['max_last_modified_time'] : '';

        // https://www.zoho.com/books/api/v3/bills/#list-bills
        const metadata = await nango.getMetadata();
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Connection metadata is missing.');
        }

        const orgId = metadata['organization_id'];
        if (typeof orgId !== 'string' || orgId.length === 0) {
            throw new Error('Connection metadata organization_id is missing or invalid.');
        }

        const params: Record<string, string> = {
            organization_id: orgId,
            sort_column: 'created_time',
            sort_order: 'A'
        };
        if (updatedAfter.length > 0) {
            params['last_modified_time'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/bills/#list-bills
            endpoint: '/books/v3/bills',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'bills'
            },
            retries: 3
        };

        for await (const billsPage of nango.paginate(proxyConfig)) {
            const normalizedBills = billsPage.map((rawBill) => {
                const parseResult = ProviderBillSchema.safeParse(rawBill);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse bill: ${parseResult.error.message}`);
                }

                const bill = parseResult.data;
                return {
                    id: bill.bill_id,
                    ...(bill.vendor_id != null && { vendor_id: bill.vendor_id }),
                    ...(bill.vendor_name != null && { vendor_name: bill.vendor_name }),
                    ...(bill.status != null && { status: bill.status }),
                    ...(bill.bill_number != null && { bill_number: bill.bill_number }),
                    ...(bill.reference_number != null && { reference_number: bill.reference_number }),
                    ...(bill.date != null && { date: bill.date }),
                    ...(bill.due_date != null && { due_date: bill.due_date }),
                    ...(bill.currency_id != null && { currency_id: bill.currency_id }),
                    ...(bill.currency_code != null && { currency_code: bill.currency_code }),
                    ...(bill.exchange_rate != null && { exchange_rate: bill.exchange_rate }),
                    ...(bill.total != null && { total: bill.total }),
                    ...(bill.balance != null && { balance: bill.balance }),
                    ...(bill.created_time != null && { created_time: bill.created_time }),
                    last_modified_time: bill.last_modified_time ?? ''
                };
            });

            if (normalizedBills.length > 0) {
                await nango.batchSave(normalizedBills, 'Bill');
            }

            for (const bill of normalizedBills) {
                if (bill.last_modified_time.length > 0 && (!maxLastModifiedTime || bill.last_modified_time > maxLastModifiedTime)) {
                    maxLastModifiedTime = bill.last_modified_time;
                }
            }

            page = page + 1;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page,
                max_last_modified_time: maxLastModifiedTime
            });
        }

        await nango.saveCheckpoint({
            updated_after: maxLastModifiedTime.length > 0 ? maxLastModifiedTime : updatedAfter,
            page: 1,
            max_last_modified_time: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
