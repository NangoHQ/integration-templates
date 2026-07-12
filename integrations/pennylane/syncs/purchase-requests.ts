import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PurchaseRequestSchema = z.object({
    id: z.string(),
    purchase_order_number: z.string().optional(),
    supplier_id: z.string(),
    supplier_url: z.string(),
    delivery_address: z.object({
        address: z.string().optional(),
        postal_code: z.string().optional(),
        city: z.string().optional(),
        country_alpha2: z.string().optional()
    }),
    status: z.enum(['to_be_validated', 'approved', 'rejected', 'invoiced']),
    currency: z.string(),
    reason: z.string().optional(),
    estimated_delivery_date: z.string().optional(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    currency_tax: z.string(),
    tax: z.string(),
    purchase_order_filename: z.string().optional(),
    purchase_order_url: z.string().optional(),
    linked_invoice_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderPurchaseRequestSchema = z.object({
    id: z.number().int(),
    purchase_order_number: z.string().nullable(),
    supplier: z.object({
        id: z.number().int(),
        url: z.string()
    }),
    delivery_address: z.object({
        address: z.string().nullable(),
        postal_code: z.string().nullable(),
        city: z.string().nullable(),
        country_alpha2: z.string().nullable()
    }),
    status: z.enum(['to_be_validated', 'approved', 'rejected', 'invoiced']),
    currency: z.string(),
    reason: z.string(),
    estimated_delivery_date: z.string().nullable(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    currency_tax: z.string(),
    tax: z.string(),
    purchase_order: z
        .object({
            filename: z.string(),
            url: z.string()
        })
        .nullable(),
    linked_invoices: z.object({
        items: z.array(
            z.object({
                id: z.number().int(),
                url: z.string()
            })
        )
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync purchase requests.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        PurchaseRequest: PurchaseRequestSchema
    },

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getpurchaserequests
            endpoint: '/api/external/v2/purchase_requests',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 50
            },
            retries: 3
        };

        await nango.trackDeletesStart('PurchaseRequest');

        for await (const batch of nango.paginate(proxyConfig)) {
            const rawItems = z.array(ProviderPurchaseRequestSchema).parse(batch);

            const mapped = rawItems.map((item) => ({
                id: String(item.id),
                ...(item.purchase_order_number != null && { purchase_order_number: item.purchase_order_number }),
                supplier_id: String(item.supplier.id),
                supplier_url: item.supplier.url,
                delivery_address: {
                    ...(item.delivery_address.address != null && { address: item.delivery_address.address }),
                    ...(item.delivery_address.postal_code != null && { postal_code: item.delivery_address.postal_code }),
                    ...(item.delivery_address.city != null && { city: item.delivery_address.city }),
                    ...(item.delivery_address.country_alpha2 != null && { country_alpha2: item.delivery_address.country_alpha2 })
                },
                status: item.status,
                currency: item.currency,
                reason: item.reason,
                ...(item.estimated_delivery_date != null && { estimated_delivery_date: item.estimated_delivery_date }),
                amount: item.amount,
                currency_amount: item.currency_amount,
                currency_amount_before_tax: item.currency_amount_before_tax,
                exchange_rate: item.exchange_rate,
                currency_tax: item.currency_tax,
                tax: item.tax,
                ...(item.purchase_order != null && {
                    purchase_order_filename: item.purchase_order.filename,
                    purchase_order_url: item.purchase_order.url
                }),
                linked_invoice_ids: item.linked_invoices.items.map((inv) => String(inv.id)),
                created_at: item.created_at,
                updated_at: item.updated_at
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'PurchaseRequest');
            }
        }

        await nango.trackDeletesEnd('PurchaseRequest');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
