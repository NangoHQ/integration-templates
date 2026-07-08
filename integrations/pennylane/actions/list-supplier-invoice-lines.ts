import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Supplier invoice identifier. Example: 12345'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderInvoiceLineSchema = z
    .object({
        id: z.number(),
        label: z.string().nullish(),
        description: z.string().nullish(),
        amount: z.string().nullish(),
        currency_amount: z.string().nullish(),
        currency_tax: z.string().nullish(),
        tax: z.string().nullish(),
        vat_rate: z.string().nullish(),
        currency_amount_before_tax: z.string().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish(),
        imputation_dates: z.unknown().nullish(),
        quantity: z.number().nullish(),
        unit: z.string().nullish(),
        price_before_tax: z.string().nullish(),
        raw_currency_amount: z.string().nullish(),
        raw_currency_unit_price: z.string().nullish(),
        position: z.number().nullish(),
        product_id: z.number().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().nullish(),
    has_more: z.boolean().optional()
});

const OutputItemSchema = z
    .object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        amount: z.string().optional(),
        currency_amount: z.string().optional(),
        currency_tax: z.string().optional(),
        tax: z.string().optional(),
        vat_rate: z.string().optional(),
        currency_amount_before_tax: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        imputation_dates: z.unknown().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        price_before_tax: z.string().optional(),
        raw_currency_amount: z.string().optional(),
        raw_currency_unit_price: z.string().optional(),
        position: z.number().optional(),
        product_id: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List invoice lines for a supplier invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getsupplierinvoicelines
        const response = await nango.get({
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(String(input.id))}/invoice_lines`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const invoiceLines = providerResponse.items ?? [];
        const items = invoiceLines.map((line: unknown) => {
            const parsed = ProviderInvoiceLineSchema.parse(line);
            const known = {
                id: parsed.id,
                ...(parsed.label != null && { label: parsed.label }),
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.amount != null && { amount: parsed.amount }),
                ...(parsed.currency_amount != null && { currency_amount: parsed.currency_amount }),
                ...(parsed.currency_tax != null && { currency_tax: parsed.currency_tax }),
                ...(parsed.tax != null && { tax: parsed.tax }),
                ...(parsed.vat_rate != null && { vat_rate: parsed.vat_rate }),
                ...(parsed.currency_amount_before_tax != null && { currency_amount_before_tax: parsed.currency_amount_before_tax }),
                ...(parsed.created_at != null && { created_at: parsed.created_at }),
                ...(parsed.updated_at != null && { updated_at: parsed.updated_at }),
                ...(parsed.imputation_dates !== undefined && { imputation_dates: parsed.imputation_dates }),
                ...(parsed.quantity != null && { quantity: parsed.quantity }),
                ...(parsed.unit != null && { unit: parsed.unit }),
                ...(parsed.price_before_tax != null && { price_before_tax: parsed.price_before_tax }),
                ...(parsed.raw_currency_amount != null && { raw_currency_amount: parsed.raw_currency_amount }),
                ...(parsed.raw_currency_unit_price != null && { raw_currency_unit_price: parsed.raw_currency_unit_price }),
                ...(parsed.position != null && { position: parsed.position }),
                ...(parsed.product_id != null && { product_id: parsed.product_id })
            };

            const knownKeys = new Set([
                'id',
                'label',
                'description',
                'amount',
                'currency_amount',
                'currency_tax',
                'tax',
                'vat_rate',
                'currency_amount_before_tax',
                'created_at',
                'updated_at',
                'imputation_dates',
                'quantity',
                'unit',
                'price_before_tax',
                'raw_currency_amount',
                'raw_currency_unit_price',
                'position',
                'product_id'
            ]);
            const extra: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (!knownKeys.has(key) && value !== null && value !== undefined) {
                    extra[key] = value;
                }
            }

            return { ...known, ...extra };
        });

        return {
            items,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            ...(providerResponse.has_more !== undefined && { has_more: providerResponse.has_more })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
