import { z } from 'zod';
import { createAction } from 'nango';

const OrderReferenceSchema = z.object({
    id: z.number().describe('Order ID. Example: 210311950')
});

const InputSchema = z.object({
    orders: z.array(OrderReferenceSchema).min(1).describe('Non-empty array of existing order references. Invoices are order-based.'),
    invoiceDate: z.string().describe('Invoice date. Example: 2024-01-15'),
    invoiceDueDate: z.string().describe('Invoice due date. Example: 2024-02-15'),
    invoiceNumber: z.number().optional().describe('Invoice number. Use 0 to auto-generate.'),
    kid: z.string().max(25).optional().describe('KID (customer identification number).'),
    comment: z.string().max(65535).optional().describe('Comment text for the specific invoice.'),
    sendToCustomer: z.boolean().optional().describe('Whether to send the invoice to the customer. Defaults to true.'),
    paymentTypeId: z.number().optional().describe('Payment type ID for prepayment.'),
    paidAmount: z.number().optional().describe('Paid amount for prepayment, in invoice currency.')
});

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    invoiceNumber: z.number().optional(),
    invoiceDate: z.string().optional(),
    invoiceDueDate: z.string().optional(),
    kid: z.string().optional(),
    comment: z.string().optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountExcludingVat: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    currency: z
        .object({
            id: z.number().optional(),
            url: z.string().optional(),
            code: z.string().optional(),
            factor: z.number().optional()
        })
        .optional(),
    customer: z
        .object({
            id: z.number().optional(),
            name: z.string().optional()
        })
        .optional(),
    orders: z
        .array(
            z.object({
                id: z.number().optional(),
                url: z.string().optional()
            })
        )
        .optional(),
    orderLines: z
        .array(
            z.object({
                id: z.number().optional(),
                url: z.string().optional()
            })
        )
        .optional(),
    isCreditNote: z.boolean().optional(),
    isCredited: z.boolean().optional(),
    isCharged: z.boolean().optional(),
    isApproved: z.boolean().optional(),
    creditedInvoice: z.number().optional(),
    voucher: z
        .object({
            id: z.number().optional(),
            url: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderInvoiceSchema
});

const OutputSchema = z.object({
    id: z.number().describe('Invoice ID'),
    url: z.string().optional().describe('Invoice URL'),
    invoiceNumber: z.number().optional().describe('Invoice number'),
    invoiceDate: z.string().optional().describe('Invoice date'),
    invoiceDueDate: z.string().optional().describe('Invoice due date'),
    kid: z.string().optional().describe('KID'),
    comment: z.string().optional().describe('Invoice comment'),
    amount: z.number().optional().describe('Amount in company currency'),
    amountCurrency: z.number().optional().describe('Amount in invoice currency'),
    amountExcludingVat: z.number().optional().describe('Amount excluding VAT'),
    amountExcludingVatCurrency: z.number().optional().describe('Amount excluding VAT in invoice currency'),
    currency: z
        .object({
            id: z.number().optional(),
            code: z.string().optional()
        })
        .optional(),
    customer: z
        .object({
            id: z.number().optional(),
            name: z.string().optional()
        })
        .optional(),
    orderIds: z.array(z.number()).optional().describe('Linked order IDs'),
    orderLineIds: z.array(z.number()).optional().describe('Linked order line IDs'),
    isCreditNote: z.boolean().optional().describe('Whether this is a credit note'),
    isCredited: z.boolean().optional().describe('Whether this invoice has been credited'),
    isCharged: z.boolean().optional().describe('Whether the invoice is charged'),
    isApproved: z.boolean().optional().describe('Whether the invoice is approved'),
    creditedInvoiceId: z.number().optional().describe('Original invoice ID if this is a credit note')
});

const action = createAction({
    description: 'Create (finalize) an invoice from one or more existing orders.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        // https://api-test.tripletex.tech/v2/swagger.json
        const response = await nango.post({
            endpoint: 'v2/invoice',
            data: {
                orders: input.orders,
                invoiceDate: input.invoiceDate,
                invoiceDueDate: input.invoiceDueDate,
                ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber }),
                ...(input.kid !== undefined && { kid: input.kid }),
                ...(input.comment !== undefined && { comment: input.comment })
            },
            params: {
                ...(input.sendToCustomer !== undefined && { sendToCustomer: String(input.sendToCustomer) }),
                ...(input.paymentTypeId !== undefined && { paymentTypeId: String(input.paymentTypeId) }),
                ...(input.paidAmount !== undefined && { paidAmount: String(input.paidAmount) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoice = providerResponse.value;

        return {
            id: invoice.id,
            ...(invoice.url !== undefined && { url: invoice.url }),
            ...(invoice.invoiceNumber !== undefined && { invoiceNumber: invoice.invoiceNumber }),
            ...(invoice.invoiceDate !== undefined && { invoiceDate: invoice.invoiceDate }),
            ...(invoice.invoiceDueDate !== undefined && { invoiceDueDate: invoice.invoiceDueDate }),
            ...(invoice.kid !== undefined && { kid: invoice.kid }),
            ...(invoice.comment !== undefined && { comment: invoice.comment }),
            ...(invoice.amount !== undefined && { amount: invoice.amount }),
            ...(invoice.amountCurrency !== undefined && { amountCurrency: invoice.amountCurrency }),
            ...(invoice.amountExcludingVat !== undefined && { amountExcludingVat: invoice.amountExcludingVat }),
            ...(invoice.amountExcludingVatCurrency !== undefined && { amountExcludingVatCurrency: invoice.amountExcludingVatCurrency }),
            ...(invoice.currency !== undefined && {
                currency: {
                    id: invoice.currency.id,
                    code: invoice.currency.code
                }
            }),
            ...(invoice.customer !== undefined && {
                customer: {
                    id: invoice.customer.id,
                    name: invoice.customer.name
                }
            }),
            ...(invoice.orders !== undefined && { orderIds: invoice.orders.flatMap((o) => (o.id !== undefined ? [o.id] : [])) }),
            ...(invoice.orderLines !== undefined && { orderLineIds: invoice.orderLines.flatMap((o) => (o.id !== undefined ? [o.id] : [])) }),
            ...(invoice.isCreditNote !== undefined && { isCreditNote: invoice.isCreditNote }),
            ...(invoice.isCredited !== undefined && { isCredited: invoice.isCredited }),
            ...(invoice.isCharged !== undefined && { isCharged: invoice.isCharged }),
            ...(invoice.isApproved !== undefined && { isApproved: invoice.isApproved }),
            ...(invoice.creditedInvoice !== undefined && { creditedInvoiceId: invoice.creditedInvoice })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
