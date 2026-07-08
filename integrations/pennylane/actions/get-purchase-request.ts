import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Purchase request identifier. Example: 1')
});

const ProviderPurchaseRequestSchema = z.object({
    id: z.number(),
    purchase_order_number: z.string().nullable(),
    supplier: z.object({
        id: z.number(),
        url: z.string()
    }),
    delivery_address: z.object({
        address: z.string().nullable(),
        postal_code: z.string().nullable(),
        city: z.string().nullable(),
        country_alpha2: z.string().nullable()
    }),
    status: z.string(),
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
                id: z.number(),
                url: z.string()
            })
        )
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    purchase_order_number: z.string().optional(),
    supplier: z.object({
        id: z.number(),
        url: z.string()
    }),
    delivery_address: z.object({
        address: z.string().optional(),
        postal_code: z.string().optional(),
        city: z.string().optional(),
        country_alpha2: z.string().optional()
    }),
    status: z.string(),
    currency: z.string(),
    reason: z.string(),
    estimated_delivery_date: z.string().optional(),
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
        .optional(),
    linked_invoices: z.object({
        items: z.array(
            z.object({
                id: z.number(),
                url: z.string()
            })
        )
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve a purchase request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_requests:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getpurchaserequest
            endpoint: `/api/external/v2/purchase_requests/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Purchase request not found',
                id: input.id
            });
        }

        const providerPurchaseRequest = ProviderPurchaseRequestSchema.parse(response.data);

        return {
            id: providerPurchaseRequest.id,
            ...(providerPurchaseRequest.purchase_order_number != null && {
                purchase_order_number: providerPurchaseRequest.purchase_order_number
            }),
            supplier: providerPurchaseRequest.supplier,
            delivery_address: {
                ...(providerPurchaseRequest.delivery_address.address != null && {
                    address: providerPurchaseRequest.delivery_address.address
                }),
                ...(providerPurchaseRequest.delivery_address.postal_code != null && {
                    postal_code: providerPurchaseRequest.delivery_address.postal_code
                }),
                ...(providerPurchaseRequest.delivery_address.city != null && {
                    city: providerPurchaseRequest.delivery_address.city
                }),
                ...(providerPurchaseRequest.delivery_address.country_alpha2 != null && {
                    country_alpha2: providerPurchaseRequest.delivery_address.country_alpha2
                })
            },
            status: providerPurchaseRequest.status,
            currency: providerPurchaseRequest.currency,
            reason: providerPurchaseRequest.reason,
            ...(providerPurchaseRequest.estimated_delivery_date != null && {
                estimated_delivery_date: providerPurchaseRequest.estimated_delivery_date
            }),
            amount: providerPurchaseRequest.amount,
            currency_amount: providerPurchaseRequest.currency_amount,
            currency_amount_before_tax: providerPurchaseRequest.currency_amount_before_tax,
            exchange_rate: providerPurchaseRequest.exchange_rate,
            currency_tax: providerPurchaseRequest.currency_tax,
            tax: providerPurchaseRequest.tax,
            ...(providerPurchaseRequest.purchase_order != null && {
                purchase_order: providerPurchaseRequest.purchase_order
            }),
            linked_invoices: providerPurchaseRequest.linked_invoices,
            created_at: providerPurchaseRequest.created_at,
            updated_at: providerPurchaseRequest.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
