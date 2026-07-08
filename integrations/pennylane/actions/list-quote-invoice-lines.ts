import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    quote_id: z.number().describe('Quote ID. Example: 25461979840512'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const ProductSchema = z.object({
    id: z.number(),
    url: z.string()
});

const DiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const InvoiceLineSchema = z.object({
    id: z.number().describe('Invoice line id'),
    label: z.string().describe('Invoice line label'),
    unit: z.string().nullable().describe('The kind of unit which applies to the amount'),
    quantity: z.string().describe('Invoice line item quantity (number of items)'),
    amount: z.string().describe('The total amount of the invoice lines in euros including taxes and deducting discounts'),
    currency_amount: z.string().describe("The total amount of the invoice lines in the document's currency including taxes and deducting discounts"),
    description: z.string().describe('Invoice line description'),
    product: ProductSchema.nullable().describe('Associated product'),
    vat_rate: z.string().describe('Product VAT rate. A 20% VAT in France is FR_200'),
    currency_amount_before_tax: z.string().describe('Total amount before tax in currency'),
    currency_tax: z.string().describe('Total tax amount in currency'),
    tax: z.string().describe('Total tax amount in euros'),
    raw_currency_unit_price: z.string().describe('Unit price (excluding tax)'),
    discount: DiscountSchema.nullable(),
    section_rank: z.number().nullable().describe('Has to correspond to the rank number of a line items section in which the line item should be'),
    created_at: z.string().describe('Creation timestamp'),
    updated_at: z.string().describe('Update timestamp')
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(InvoiceLineSchema)
});

const OutputSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().optional(),
    items: z.array(InvoiceLineSchema)
});

const action = createAction({
    description: 'List invoice lines for a quote',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getquoteinvoicelines
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(input.quote_id)}/invoice_lines`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            has_more: providerResponse.has_more,
            items: providerResponse.items,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
