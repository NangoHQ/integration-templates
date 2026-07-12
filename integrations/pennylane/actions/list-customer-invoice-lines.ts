import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    sort: z.string().optional().describe('Sort field. May be prefixed with `-` for descending order. Available fields: `id`, `rank`.')
});

const ProviderProductSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const ProviderDiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const ProviderImputationDatesSchema = z.object({
    start_date: z.string(),
    end_date: z.string()
});

const ProviderInvoiceLineSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    unit: z.string().nullable(),
    quantity: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    description: z.string(),
    product: ProviderProductSchema.nullable(),
    vat_rate: z.string(),
    currency_amount_before_tax: z.string(),
    currency_tax: z.string(),
    tax: z.string(),
    raw_currency_unit_price: z.string(),
    discount: ProviderDiscountSchema.nullable(),
    section_rank: z.number().int().nullable(),
    imputation_dates: ProviderImputationDatesSchema.nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderInvoiceLineSchema)
});

const InvoiceLineSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    unit: z.string().nullable().optional(),
    quantity: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    description: z.string(),
    product: ProviderProductSchema.nullable().optional(),
    vat_rate: z.string(),
    currency_amount_before_tax: z.string(),
    currency_tax: z.string(),
    tax: z.string(),
    raw_currency_unit_price: z.string(),
    discount: ProviderDiscountSchema.nullable().optional(),
    section_rank: z.number().int().nullable().optional(),
    imputation_dates: ProviderImputationDatesSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(InvoiceLineSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoice lines for a customer invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoiceinvoicelines
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}/invoice_lines`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((line) => ({
                id: line.id,
                label: line.label,
                ...(line.unit !== null && { unit: line.unit }),
                quantity: line.quantity,
                amount: line.amount,
                currency_amount: line.currency_amount,
                description: line.description,
                ...(line.product !== null && { product: line.product }),
                vat_rate: line.vat_rate,
                currency_amount_before_tax: line.currency_amount_before_tax,
                currency_tax: line.currency_tax,
                tax: line.tax,
                raw_currency_unit_price: line.raw_currency_unit_price,
                ...(line.discount !== null && { discount: line.discount }),
                ...(line.section_rank !== null && { section_rank: line.section_rank }),
                ...(line.imputation_dates !== null && { imputation_dates: line.imputation_dates }),
                created_at: line.created_at,
                updated_at: line.updated_at
            })),
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor !== null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
