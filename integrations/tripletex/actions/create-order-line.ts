import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.number().describe('Order ID. Example: 210311951'),
    productId: z.number().describe('Product ID. Example: 69781078'),
    count: z.number().describe('Quantity. Example: 2'),
    description: z.string().optional().describe('Line description'),
    unitPriceExcludingVatCurrency: z.number().optional().describe('Unit price excluding VAT in the order currency'),
    unitPriceIncludingVatCurrency: z.number().optional().describe('Unit price including VAT in the order currency'),
    discount: z.number().optional().describe('Discount percentage'),
    markup: z.number().optional().describe('Markup percentage'),
    vatTypeId: z.number().optional().describe('VAT type ID')
});

const ProviderOrderLineSchema = z.object({
    id: z.number(),
    version: z.number().optional().nullable(),
    url: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    count: z.number().optional().nullable(),
    unitCostCurrency: z.number().optional().nullable(),
    unitPriceExcludingVatCurrency: z.number().optional().nullable(),
    unitPriceIncludingVatCurrency: z.number().optional().nullable(),
    amountExcludingVatCurrency: z.number().optional().nullable(),
    amountIncludingVatCurrency: z.number().optional().nullable(),
    discount: z.number().optional().nullable(),
    markup: z.number().optional().nullable(),
    isSubscription: z.boolean().optional().nullable(),
    sortIndex: z.number().optional().nullable(),
    isPicked: z.boolean().optional().nullable(),
    pickedDate: z.string().optional().nullable(),
    orderedQuantity: z.number().optional().nullable(),
    isCharged: z.boolean().optional().nullable(),
    order: z
        .object({
            id: z.number().optional().nullable()
        })
        .optional()
        .nullable(),
    product: z
        .object({
            id: z.number().optional().nullable()
        })
        .optional()
        .nullable(),
    currency: z
        .object({
            id: z.number().optional().nullable(),
            code: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    vatType: z
        .object({
            id: z.number().optional().nullable(),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const ProviderResponseSchema = z.object({
    value: ProviderOrderLineSchema
});

const OutputSchema = z.object({
    id: z.number().describe('Order line ID'),
    orderId: z.number().optional(),
    productId: z.number().optional(),
    description: z.string().optional(),
    count: z.number().optional(),
    unitPriceExcludingVatCurrency: z.number().optional(),
    unitPriceIncludingVatCurrency: z.number().optional(),
    amountExcludingVatCurrency: z.number().optional(),
    amountIncludingVatCurrency: z.number().optional(),
    discount: z.number().optional(),
    markup: z.number().optional(),
    currencyCode: z.string().optional(),
    vatTypeId: z.number().optional(),
    vatTypeName: z.string().optional(),
    isSubscription: z.boolean().optional(),
    sortIndex: z.number().optional(),
    isPicked: z.boolean().optional(),
    pickedDate: z.string().optional(),
    orderedQuantity: z.number().optional(),
    isCharged: z.boolean().optional()
});

const action = createAction({
    description: 'Add a line item to an existing order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            order: { id: number };
            product: { id: number };
            count: number;
            description?: string;
            unitPriceExcludingVatCurrency?: number;
            unitPriceIncludingVatCurrency?: number;
            discount?: number;
            markup?: number;
            vatType?: { id: number };
        } = {
            order: { id: input.orderId },
            product: { id: input.productId },
            count: input.count
        };

        if (input.description !== undefined) {
            requestBody.description = input.description;
        }
        if (input.unitPriceExcludingVatCurrency !== undefined) {
            requestBody.unitPriceExcludingVatCurrency = input.unitPriceExcludingVatCurrency;
        }
        if (input.unitPriceIncludingVatCurrency !== undefined) {
            requestBody.unitPriceIncludingVatCurrency = input.unitPriceIncludingVatCurrency;
        }
        if (input.discount !== undefined) {
            requestBody.discount = input.discount;
        }
        if (input.markup !== undefined) {
            requestBody.markup = input.markup;
        }
        if (input.vatTypeId !== undefined) {
            requestBody.vatType = { id: input.vatTypeId };
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.post({
            endpoint: 'v2/order/orderline',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const line = providerResponse.value;

        return {
            id: line.id,
            ...(line.order?.id != null && { orderId: line.order.id }),
            ...(line.product?.id != null && { productId: line.product.id }),
            ...(line.description != null && { description: line.description }),
            ...(line.count != null && { count: line.count }),
            ...(line.unitPriceExcludingVatCurrency != null && {
                unitPriceExcludingVatCurrency: line.unitPriceExcludingVatCurrency
            }),
            ...(line.unitPriceIncludingVatCurrency != null && {
                unitPriceIncludingVatCurrency: line.unitPriceIncludingVatCurrency
            }),
            ...(line.amountExcludingVatCurrency != null && {
                amountExcludingVatCurrency: line.amountExcludingVatCurrency
            }),
            ...(line.amountIncludingVatCurrency != null && {
                amountIncludingVatCurrency: line.amountIncludingVatCurrency
            }),
            ...(line.discount != null && { discount: line.discount }),
            ...(line.markup != null && { markup: line.markup }),
            ...(line.currency?.code != null && { currencyCode: line.currency.code }),
            ...(line.vatType?.id != null && { vatTypeId: line.vatType.id }),
            ...(line.vatType?.name != null && { vatTypeName: line.vatType.name }),
            ...(line.isSubscription != null && { isSubscription: line.isSubscription }),
            ...(line.sortIndex != null && { sortIndex: line.sortIndex }),
            ...(line.isPicked != null && { isPicked: line.isPicked }),
            ...(line.pickedDate != null && { pickedDate: line.pickedDate }),
            ...(line.orderedQuantity != null && { orderedQuantity: line.orderedQuantity }),
            ...(line.isCharged != null && { isCharged: line.isCharged })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
