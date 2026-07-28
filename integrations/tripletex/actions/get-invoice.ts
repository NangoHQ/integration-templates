import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Invoice ID. Example: 1945373645')
});

const ProviderCustomerSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const ProviderOrderSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const ProviderCurrencySchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    invoiceNumber: z.number().optional(),
    invoiceDate: z.string().optional(),
    customer: ProviderCustomerSchema.optional(),
    creditedInvoice: z.number().optional(),
    isCredited: z.boolean().optional(),
    invoiceDueDate: z.string().optional(),
    kid: z.string().optional(),
    invoiceComment: z.string().optional(),
    comment: z.string().optional(),
    orders: z.array(ProviderOrderSchema).optional(),
    deliveryDate: z.string().optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountExcludingVat: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    amountOutstanding: z.number().optional(),
    amountCurrencyOutstanding: z.number().optional(),
    amountOutstandingTotal: z.number().optional(),
    amountCurrencyOutstandingTotal: z.number().optional(),
    sumRemits: z.number().optional(),
    currency: ProviderCurrencySchema.optional(),
    isCreditNote: z.boolean().optional(),
    isCharged: z.boolean().optional(),
    isApproved: z.boolean().optional(),
    documentId: z.number().optional(),
    ehfSendStatus: z.string().optional(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderInvoiceSchema
});

const OutputSchema = z.object({
    id: z.string(),
    invoiceNumber: z.number().optional(),
    invoiceDate: z.string().optional(),
    invoiceDueDate: z.string().optional(),
    customerId: z.number().optional(),
    creditedInvoiceId: z.number().optional(),
    isCredited: z.boolean().optional(),
    kid: z.string().optional(),
    comment: z.string().optional(),
    invoiceComment: z.string().optional(),
    orderIds: z.array(z.number()).optional(),
    deliveryDate: z.string().optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountExcludingVat: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    amountOutstanding: z.number().optional(),
    amountCurrencyOutstanding: z.number().optional(),
    amountOutstandingTotal: z.number().optional(),
    amountCurrencyOutstandingTotal: z.number().optional(),
    sumRemits: z.number().optional(),
    currencyId: z.number().optional(),
    isCreditNote: z.boolean().optional(),
    isCharged: z.boolean().optional(),
    isApproved: z.boolean().optional(),
    documentId: z.number().optional(),
    ehfSendStatus: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: `v2/invoice/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoice = providerResponse.value;

        return {
            id: String(invoice.id),
            ...(invoice.invoiceNumber !== undefined && { invoiceNumber: invoice.invoiceNumber }),
            ...(invoice.invoiceDate !== undefined && { invoiceDate: invoice.invoiceDate }),
            ...(invoice.invoiceDueDate !== undefined && { invoiceDueDate: invoice.invoiceDueDate }),
            ...(invoice.customer !== undefined && { customerId: invoice.customer.id }),
            ...(invoice.creditedInvoice !== undefined && { creditedInvoiceId: invoice.creditedInvoice }),
            ...(invoice.isCredited !== undefined && { isCredited: invoice.isCredited }),
            ...(invoice.kid !== undefined && { kid: invoice.kid }),
            ...(invoice.comment !== undefined && { comment: invoice.comment }),
            ...(invoice.invoiceComment !== undefined && { invoiceComment: invoice.invoiceComment }),
            ...(invoice.orders !== undefined && { orderIds: invoice.orders.map((order) => order.id) }),
            ...(invoice.deliveryDate !== undefined && { deliveryDate: invoice.deliveryDate }),
            ...(invoice.amount !== undefined && { amount: invoice.amount }),
            ...(invoice.amountCurrency !== undefined && { amountCurrency: invoice.amountCurrency }),
            ...(invoice.amountExcludingVat !== undefined && { amountExcludingVat: invoice.amountExcludingVat }),
            ...(invoice.amountExcludingVatCurrency !== undefined && { amountExcludingVatCurrency: invoice.amountExcludingVatCurrency }),
            ...(invoice.amountOutstanding !== undefined && { amountOutstanding: invoice.amountOutstanding }),
            ...(invoice.amountCurrencyOutstanding !== undefined && { amountCurrencyOutstanding: invoice.amountCurrencyOutstanding }),
            ...(invoice.amountOutstandingTotal !== undefined && { amountOutstandingTotal: invoice.amountOutstandingTotal }),
            ...(invoice.amountCurrencyOutstandingTotal !== undefined && { amountCurrencyOutstandingTotal: invoice.amountCurrencyOutstandingTotal }),
            ...(invoice.sumRemits !== undefined && { sumRemits: invoice.sumRemits }),
            ...(invoice.currency !== undefined && { currencyId: invoice.currency.id }),
            ...(invoice.isCreditNote !== undefined && { isCreditNote: invoice.isCreditNote }),
            ...(invoice.isCharged !== undefined && { isCharged: invoice.isCharged }),
            ...(invoice.isApproved !== undefined && { isApproved: invoice.isApproved }),
            ...(invoice.documentId !== undefined && { documentId: invoice.documentId }),
            ...(invoice.ehfSendStatus !== undefined && { ehfSendStatus: invoice.ehfSendStatus }),
            ...(invoice.url !== undefined && { url: invoice.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
