import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const LinkedInvoiceSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const PurchaseOrderSchema = z.object({
    filename: z.string(),
    url: z.string()
});

const SupplierSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const DeliveryAddressSchema = z.object({
    address: z.string().nullable(),
    postal_code: z.string().nullable(),
    city: z.string().nullable(),
    country_alpha2: z.string().nullable()
});

const PurchaseRequestSchema = z.object({
    id: z.number().int(),
    purchase_order_number: z.string().nullable().optional(),
    supplier: SupplierSchema,
    delivery_address: DeliveryAddressSchema,
    status: z.string(),
    currency: z.string(),
    reason: z.string(),
    estimated_delivery_date: z.string().nullable().optional(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    currency_tax: z.string(),
    tax: z.string(),
    purchase_order: PurchaseOrderSchema.nullable().optional(),
    linked_invoices: z.object({
        items: z.array(LinkedInvoiceSchema)
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(PurchaseRequestSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List purchase requests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_requests:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getpurchaserequests
        const response = await nango.get({
            endpoint: '/api/external/v2/purchase_requests',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.items.map((item: unknown) => {
            return PurchaseRequestSchema.parse(item);
        });

        return {
            items,
            ...(listResponse.next_cursor != null && { next_cursor: listResponse.next_cursor }),
            ...(listResponse.has_more !== undefined && { has_more: listResponse.has_more })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
