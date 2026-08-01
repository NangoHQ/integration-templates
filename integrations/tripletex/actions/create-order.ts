import { z } from 'zod';
import { createAction } from 'nango';

const CustomerRefSchema = z.object({
    id: z.number().describe('Customer ID. Example: 93640703')
});

const ProductRefSchema = z.object({
    id: z.number().describe('Product ID. Example: 69781078')
});

const OrderLineInputSchema = z.object({
    product: ProductRefSchema,
    count: z.number().describe('Quantity. Example: 2'),
    description: z.string().optional(),
    unitPriceExcludingVatCurrency: z.number().optional(),
    unitPriceIncludingVatCurrency: z.number().optional(),
    discount: z.number().optional(),
    markup: z.number().optional()
});

const InputSchema = z.object({
    customer: CustomerRefSchema,
    orderDate: z.string().describe('Order date (ISO 8601). Example: 2026-07-28'),
    deliveryDate: z.string().describe('Delivery date (ISO 8601). Example: 2026-07-28'),
    orderLines: z.array(OrderLineInputSchema).optional(),
    contact: z.object({ id: z.number() }).optional(),
    attn: z.object({ id: z.number() }).optional(),
    ourContactEmployee: z.object({ id: z.number() }).optional(),
    department: z.object({ id: z.number() }).optional(),
    project: z.object({ id: z.number() }).optional(),
    currency: z.object({ id: z.number() }).optional(),
    reference: z.string().optional(),
    receiverEmail: z.string().optional(),
    deliveryComment: z.string().optional(),
    invoiceComment: z.string().optional(),
    isClosed: z.boolean().optional(),
    isSubscription: z.boolean().optional()
});

const ProviderOrderLineSchema = z.object({
    id: z.number().optional(),
    product: z.object({ id: z.number() }).nullable().optional(),
    count: z.number().optional(),
    description: z.string().nullable().optional(),
    unitPriceExcludingVatCurrency: z.number().nullable().optional(),
    unitPriceIncludingVatCurrency: z.number().nullable().optional(),
    amountExcludingVatCurrency: z.number().nullable().optional(),
    amountIncludingVatCurrency: z.number().nullable().optional(),
    discount: z.number().nullable().optional(),
    markup: z.number().nullable().optional()
});

const ProviderInvoiceSchema = z.object({
    id: z.number().nullable().optional(),
    url: z.string().nullable().optional()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    version: z.number().nullable().optional(),
    url: z.string().nullable().optional(),
    customer: z.object({ id: z.number() }).nullable().optional(),
    contact: z.object({ id: z.number() }).nullable().optional(),
    orderDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    receiverEmail: z.string().nullable().optional(),
    deliveryComment: z.string().nullable().optional(),
    invoiceComment: z.string().nullable().optional(),
    isClosed: z.boolean().nullable().optional(),
    isSubscription: z.boolean().nullable().optional(),
    orderLines: z.array(ProviderOrderLineSchema).nullable().optional(),
    preliminaryInvoice: ProviderInvoiceSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    customerId: z.number().optional(),
    contactId: z.number().optional(),
    orderDate: z.string().optional(),
    deliveryDate: z.string().optional(),
    number: z.string().optional(),
    reference: z.string().optional(),
    receiverEmail: z.string().optional(),
    deliveryComment: z.string().optional(),
    invoiceComment: z.string().optional(),
    isClosed: z.boolean().optional(),
    isSubscription: z.boolean().optional(),
    orderLines: z
        .array(
            z.object({
                id: z.number().optional(),
                productId: z.number().optional(),
                count: z.number().optional(),
                description: z.string().optional(),
                unitPriceExcludingVatCurrency: z.number().optional(),
                unitPriceIncludingVatCurrency: z.number().optional(),
                amountExcludingVatCurrency: z.number().optional(),
                amountIncludingVatCurrency: z.number().optional(),
                discount: z.number().optional(),
                markup: z.number().optional()
            })
        )
        .optional(),
    preliminaryInvoice: z
        .object({
            id: z.number().optional(),
            url: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create an order for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        // https://api-test.tripletex.tech/v2/swagger.json
        const response = await nango.post({
            endpoint: 'v2/order',
            data: {
                customer: { id: input.customer.id },
                orderDate: input.orderDate,
                deliveryDate: input.deliveryDate,
                ...(input.orderLines !== undefined && {
                    orderLines: input.orderLines.map((line) => ({
                        product: { id: line.product.id },
                        count: line.count,
                        ...(line.description !== undefined && { description: line.description }),
                        ...(line.unitPriceExcludingVatCurrency !== undefined && { unitPriceExcludingVatCurrency: line.unitPriceExcludingVatCurrency }),
                        ...(line.unitPriceIncludingVatCurrency !== undefined && { unitPriceIncludingVatCurrency: line.unitPriceIncludingVatCurrency }),
                        ...(line.discount !== undefined && { discount: line.discount }),
                        ...(line.markup !== undefined && { markup: line.markup })
                    }))
                }),
                ...(input.contact !== undefined && { contact: { id: input.contact.id } }),
                ...(input.attn !== undefined && { attn: { id: input.attn.id } }),
                ...(input.ourContactEmployee !== undefined && { ourContactEmployee: { id: input.ourContactEmployee.id } }),
                ...(input.department !== undefined && { department: { id: input.department.id } }),
                ...(input.project !== undefined && { project: { id: input.project.id } }),
                ...(input.currency !== undefined && { currency: { id: input.currency.id } }),
                ...(input.reference !== undefined && { reference: input.reference }),
                ...(input.receiverEmail !== undefined && { receiverEmail: input.receiverEmail }),
                ...(input.deliveryComment !== undefined && { deliveryComment: input.deliveryComment }),
                ...(input.invoiceComment !== undefined && { invoiceComment: input.invoiceComment }),
                ...(input.isClosed !== undefined && { isClosed: input.isClosed }),
                ...(input.isSubscription !== undefined && { isSubscription: input.isSubscription })
            },
            retries: 3
        });

        const providerOrder = ProviderOrderSchema.parse(response.data.value);

        return {
            id: providerOrder.id,
            version: providerOrder.version ?? undefined,
            url: providerOrder.url ?? undefined,
            customerId: providerOrder.customer?.id ?? undefined,
            contactId: providerOrder.contact?.id ?? undefined,
            orderDate: providerOrder.orderDate ?? undefined,
            deliveryDate: providerOrder.deliveryDate ?? undefined,
            number: providerOrder.number ?? undefined,
            reference: providerOrder.reference ?? undefined,
            receiverEmail: providerOrder.receiverEmail ?? undefined,
            deliveryComment: providerOrder.deliveryComment ?? undefined,
            invoiceComment: providerOrder.invoiceComment ?? undefined,
            isClosed: providerOrder.isClosed ?? undefined,
            isSubscription: providerOrder.isSubscription ?? undefined,
            orderLines:
                providerOrder.orderLines?.map((line) => ({
                    id: line.id ?? undefined,
                    productId: line.product?.id ?? undefined,
                    count: line.count ?? undefined,
                    description: line.description ?? undefined,
                    unitPriceExcludingVatCurrency: line.unitPriceExcludingVatCurrency ?? undefined,
                    unitPriceIncludingVatCurrency: line.unitPriceIncludingVatCurrency ?? undefined,
                    amountExcludingVatCurrency: line.amountExcludingVatCurrency ?? undefined,
                    amountIncludingVatCurrency: line.amountIncludingVatCurrency ?? undefined,
                    discount: line.discount ?? undefined,
                    markup: line.markup ?? undefined
                })) ?? undefined,
            ...(providerOrder.preliminaryInvoice != null && {
                preliminaryInvoice: {
                    id: providerOrder.preliminaryInvoice.id ?? undefined,
                    url: providerOrder.preliminaryInvoice.url ?? undefined
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
