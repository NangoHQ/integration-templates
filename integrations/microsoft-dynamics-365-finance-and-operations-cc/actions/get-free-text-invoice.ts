import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    invoiceIdentifier: z.union([z.string(), z.number()]).describe('Numeric invoice identifier. Example: 5637144588')
});

const ProviderFreeTextInvoiceHeaderSchema = z
    .object({
        InvoiceIdentifier: z.union([z.string(), z.number()]),
        dataAreaId: z.string(),
        FreeTextNumber: z.string().optional(),
        CustomerAccount: z.string().optional(),
        Name: z.string().optional(),
        InvoiceDate: z.string().optional(),
        DueDate: z.string().optional(),
        CurrencyCode: z.string().optional(),
        Amount: z.union([z.string(), z.number()]).optional(),
        IsPosted: z.union([z.string(), z.boolean()]).optional(),
        Status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    invoiceIdentifier: z.union([z.string(), z.number()]),
    dataAreaId: z.string(),
    freeTextNumber: z.string().optional(),
    customerAccount: z.string().optional(),
    name: z.string().optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    currencyCode: z.string().optional(),
    amount: z.number().optional(),
    isPosted: z.boolean().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a free text invoice header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const invoiceIdentifier = typeof input.invoiceIdentifier === 'number' ? String(input.invoiceIdentifier) : input.invoiceIdentifier;

        // InvoiceIdentifier is a raw numeric OData key segment (no surrounding quotes), so it must be
        // restricted to digits only. Otherwise a crafted string could alter/break out of the URL
        // instead of identifying a single invoice.
        if (!/^\d+$/.test(invoiceIdentifier)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'invoiceIdentifier must contain only decimal digits.',
                invoiceIdentifier: input.invoiceIdentifier
            });
        }

        const encodedDataAreaId = encodeURIComponent(input.dataAreaId.replace(/'/g, "''"));

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: `/data/FreeTextInvoiceHeaders(dataAreaId='${encodedDataAreaId}',InvoiceIdentifier=${invoiceIdentifier})`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Free text invoice header not found.',
                dataAreaId: input.dataAreaId,
                invoiceIdentifier: input.invoiceIdentifier
            });
        }

        const header = ProviderFreeTextInvoiceHeaderSchema.parse(response.data);

        const mappedAmount = header.Amount != null ? (typeof header.Amount === 'number' ? header.Amount : parseFloat(header.Amount)) : undefined;
        const mappedIsPosted = header.IsPosted != null ? (typeof header.IsPosted === 'boolean' ? header.IsPosted : header.IsPosted === 'Yes') : undefined;

        return {
            invoiceIdentifier: header.InvoiceIdentifier,
            dataAreaId: header.dataAreaId,
            ...(header.FreeTextNumber != null && { freeTextNumber: header.FreeTextNumber }),
            ...(header.CustomerAccount != null && { customerAccount: header.CustomerAccount }),
            ...(header.Name != null && { name: header.Name }),
            ...(header.InvoiceDate != null && { invoiceDate: header.InvoiceDate }),
            ...(header.DueDate != null && { dueDate: header.DueDate }),
            ...(header.CurrencyCode != null && { currencyCode: header.CurrencyCode }),
            ...(mappedAmount != null && { amount: mappedAmount }),
            ...(mappedIsPosted != null && { isPosted: mappedIsPosted }),
            ...(header.Status != null && { status: header.Status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
