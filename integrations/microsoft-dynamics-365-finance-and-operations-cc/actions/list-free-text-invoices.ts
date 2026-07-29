import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('Whether to query across all companies. Defaults to false (scoped to the default company).')
});

const ProviderInvoiceSchema = z.object({
    InvoiceIdentifier: z.number(),
    dataAreaId: z.string(),
    FreeTextNumber: z.string().optional(),
    InvoiceDate: z.string().optional(),
    DueDate: z.string().optional(),
    CustomerAccount: z.string().optional(),
    CurrencyCode: z.string().optional(),
    TotalAmount: z.number().optional(),
    Description: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderInvoiceSchema)
});

const InvoiceOutputSchema = z.object({
    invoice_identifier: z.string(),
    data_area_id: z.string(),
    free_text_number: z.string().optional(),
    invoice_date: z.string().optional(),
    due_date: z.string().optional(),
    customer_account: z.string().optional(),
    currency_code: z.string().optional(),
    total_amount: z.number().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(InvoiceOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List free text (miscellaneous) customer invoice headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/FreeTextInvoiceHeaders',
            params,
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const invoices = listResponse.value;

        const items = invoices.map((invoice) => ({
            invoice_identifier: String(invoice.InvoiceIdentifier),
            data_area_id: invoice.dataAreaId,
            ...(invoice.FreeTextNumber !== undefined && { free_text_number: invoice.FreeTextNumber }),
            ...(invoice.InvoiceDate !== undefined && { invoice_date: invoice.InvoiceDate }),
            ...(invoice.DueDate !== undefined && { due_date: invoice.DueDate }),
            ...(invoice.CustomerAccount !== undefined && { customer_account: invoice.CustomerAccount }),
            ...(invoice.CurrencyCode !== undefined && { currency_code: invoice.CurrencyCode }),
            ...(invoice.TotalAmount !== undefined && { total_amount: invoice.TotalAmount }),
            ...(invoice.Description !== undefined && { description: invoice.Description })
        }));

        const nextCursor = invoices.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
