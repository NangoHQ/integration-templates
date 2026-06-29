import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account identifier. Example: "ZyQ04o"')
});

const UnitCostInputSchema = z.object({
    amount: z.string().describe('Unit cost amount. Example: "1500.00"'),
    code: z.string().describe('Currency code. Example: "USD"')
});

const LineItemInputSchema = z.object({
    type: z.number().optional().describe('Line type. 0 for item, 1 for unbilled expense. Example: 0'),
    name: z.string().describe('Line item name. Example: "Consulting Services"'),
    qty: z.number().describe('Quantity. Example: 1'),
    unit_cost: UnitCostInputSchema
});

const InputSchema = z.object({
    customerid: z.number().describe('Customer ID. Example: 567521'),
    create_date: z.string().optional().describe('Invoice creation date in YYYY-MM-DD format. Example: "2024-01-15"'),
    currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
    lines: z.array(LineItemInputSchema).describe('Invoice line items')
});

const ProviderAmountSchema = z.object({
    amount: z.string(),
    code: z.string()
});

const ProviderLineSchema = z.object({
    type: z.union([z.number(), z.null()]).optional(),
    name: z.string(),
    qty: z.union([z.number(), z.string()]),
    unit_cost: ProviderAmountSchema.optional(),
    amount: ProviderAmountSchema.optional(),
    description: z.string().optional().nullable(),
    expenseid: z.union([z.number(), z.null()]).optional()
});

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    invoiceid: z.number(),
    customerid: z.number(),
    status: z.number(),
    display_status: z.string(),
    create_date: z.string(),
    currency_code: z.string(),
    amount: ProviderAmountSchema,
    outstanding: ProviderAmountSchema,
    paid: ProviderAmountSchema,
    lines: z.array(ProviderLineSchema).optional(),
    invoice_number: z.string().optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    discount_value: z.union([z.string(), z.number()]).optional(),
    vis_state: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    invoiceid: z.number(),
    customerid: z.number(),
    status: z.number(),
    display_status: z.string(),
    create_date: z.string(),
    currency_code: z.string(),
    amount: ProviderAmountSchema,
    outstanding: ProviderAmountSchema,
    paid: ProviderAmountSchema,
    lines: z.array(ProviderLineSchema).optional(),
    invoice_number: z.string().optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    discount_value: z.union([z.string(), z.number()]).optional(),
    vis_state: z.number().optional()
});

const action = createAction({
    description: 'Create an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:invoices:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }
        const accountId = metadataResult.data.accountId;

        const invoiceBody: Record<string, unknown> = {
            customerid: input.customerid,
            lines: input.lines.map((line) => ({
                ...(line.type !== undefined && { type: line.type }),
                name: line.name,
                qty: line.qty,
                unit_cost: line.unit_cost
            }))
        };

        if (input.create_date !== undefined) {
            invoiceBody['create_date'] = input.create_date;
        }
        if (input.currency_code !== undefined) {
            invoiceBody['currency_code'] = input.currency_code;
        }

        // https://www.freshbooks.com/api/invoices
        const response = await nango.post({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices`,
            data: { invoice: invoiceBody },
            retries: 3
        });

        const rawData = response.data;
        if (typeof rawData !== 'object' || rawData === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from FreshBooks API.'
            });
        }
        if (!('response' in rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing response wrapper from FreshBooks API.'
            });
        }
        const responseWrapper = rawData.response;
        if (typeof responseWrapper !== 'object' || responseWrapper === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response wrapper from FreshBooks API.'
            });
        }
        if (!('result' in responseWrapper)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing result in FreshBooks API response.'
            });
        }
        const result = responseWrapper.result;
        if (typeof result !== 'object' || result === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid result in FreshBooks API response.'
            });
        }
        if (!('invoice' in result)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing invoice in FreshBooks API response.'
            });
        }
        const providerInvoice = ProviderInvoiceSchema.parse(result.invoice);

        return {
            id: providerInvoice.id,
            invoiceid: providerInvoice.invoiceid,
            customerid: providerInvoice.customerid,
            status: providerInvoice.status,
            display_status: providerInvoice.display_status,
            create_date: providerInvoice.create_date,
            currency_code: providerInvoice.currency_code,
            amount: providerInvoice.amount,
            outstanding: providerInvoice.outstanding,
            paid: providerInvoice.paid,
            ...(providerInvoice.lines !== undefined && { lines: providerInvoice.lines }),
            ...(providerInvoice.invoice_number !== undefined && { invoice_number: providerInvoice.invoice_number }),
            ...(providerInvoice.notes !== undefined && { notes: providerInvoice.notes }),
            ...(providerInvoice.terms !== undefined && { terms: providerInvoice.terms }),
            ...(providerInvoice.due_date !== undefined && { due_date: providerInvoice.due_date }),
            ...(providerInvoice.description !== undefined && { description: providerInvoice.description }),
            ...(providerInvoice.discount_value !== undefined && { discount_value: providerInvoice.discount_value }),
            ...(providerInvoice.vis_state !== undefined && { vis_state: providerInvoice.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
