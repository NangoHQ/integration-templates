import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerAccount: z.string().describe('Customer account number. Example: "DAT-000004"'),
    invoiceDate: z.string().describe('Invoice date in ISO 8601 format. Example: "2026-07-29"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"'),
    description: z.string().optional().describe('Invoice description'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 format')
});

const ProviderResponseSchema = z.object({
    InvoiceIdentifier: z.union([z.string(), z.number()]).transform((val) => String(val)),
    CustomerAccount: z.string().optional(),
    InvoiceDate: z.string().optional(),
    CurrencyCode: z.string().optional(),
    Description: z.string().optional(),
    DueDate: z.string().optional(),
    FreeTextNumber: z.string().optional()
});

const OutputSchema = z.object({
    invoiceIdentifier: z.string(),
    customerAccount: z.string().optional(),
    invoiceDate: z.string().optional(),
    currencyCode: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    freeTextNumber: z.string().optional()
});

const action = createAction({
    description: 'Create a free text invoice header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            CustomerAccount: input.customerAccount,
            InvoiceDate: input.invoiceDate,
            CurrencyCode: input.currencyCode,
            ...(input.description !== undefined && { Description: input.description }),
            ...(input.dueDate !== undefined && { DueDate: input.dueDate })
        };

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/FreeTextInvoiceHeaders',
            data,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            invoiceIdentifier: providerResponse.InvoiceIdentifier,
            ...(providerResponse.CustomerAccount !== undefined && { customerAccount: providerResponse.CustomerAccount }),
            ...(providerResponse.InvoiceDate !== undefined && { invoiceDate: providerResponse.InvoiceDate }),
            ...(providerResponse.CurrencyCode !== undefined && { currencyCode: providerResponse.CurrencyCode }),
            ...(providerResponse.Description !== undefined && { description: providerResponse.Description }),
            ...(providerResponse.DueDate !== undefined && { dueDate: providerResponse.DueDate }),
            ...(providerResponse.FreeTextNumber !== undefined && { freeTextNumber: providerResponse.FreeTextNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
