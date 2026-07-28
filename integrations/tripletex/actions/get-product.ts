import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product ID. Example: 69781078')
});

const CurrencySchema = z.object({
    id: z.number(),
    code: z.string().optional(),
    factor: z.number().optional()
});

const VatTypeSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    percentage: z.number().optional()
});

const ProductUnitSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const DepartmentSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const AccountSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    number: z.string().optional()
});

const SupplierSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().nullish(),
    url: z.string().nullish(),
    name: z.string().nullish(),
    number: z.string().nullish(),
    displayNumber: z.string().nullish(),
    description: z.string().nullish(),
    orderLineDescription: z.string().nullish(),
    ean: z.string().nullish(),
    costExcludingVatCurrency: z.number().nullish(),
    expenses: z.number().nullish(),
    costPrice: z.number().nullish(),
    priceExcludingVatCurrency: z.number().nullish(),
    priceIncludingVatCurrency: z.number().nullish(),
    isInactive: z.boolean().nullish(),
    discountGroup: z.unknown().nullish(),
    productUnit: ProductUnitSchema.nullable().optional(),
    isStockItem: z.boolean().nullish(),
    vatType: VatTypeSchema.nullable().optional(),
    currency: CurrencySchema.nullable().optional(),
    department: DepartmentSchema.nullable().optional(),
    account: AccountSchema.nullable().optional(),
    discountPrice: z.number().nullish(),
    supplier: SupplierSchema.nullable().optional(),
    resaleProduct: z.unknown().nullish(),
    hasSupplierProductConnected: z.boolean().nullish(),
    weight: z.number().nullish(),
    weightUnit: z.string().nullish(),
    volume: z.number().nullish(),
    volumeUnit: z.string().nullish(),
    hsnCode: z.string().nullish(),
    displayName: z.string().nullish(),
    priceInTargetCurrency: z.number().nullish(),
    purchasePriceCurrency: z.number().nullish()
});

const ProviderResponseSchema = z.object({
    value: ProviderProductSchema
});

const OutputSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    displayNumber: z.string().optional(),
    description: z.string().optional(),
    orderLineDescription: z.string().optional(),
    ean: z.string().optional(),
    costExcludingVatCurrency: z.number().optional(),
    expenses: z.number().optional(),
    costPrice: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    priceIncludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional(),
    discountGroup: z.unknown().optional(),
    productUnit: ProductUnitSchema.optional(),
    isStockItem: z.boolean().optional(),
    vatType: VatTypeSchema.optional(),
    currency: CurrencySchema.optional(),
    department: DepartmentSchema.optional(),
    account: AccountSchema.optional(),
    discountPrice: z.number().optional(),
    supplier: SupplierSchema.optional(),
    resaleProduct: z.unknown().optional(),
    hasSupplierProductConnected: z.boolean().optional(),
    weight: z.number().optional(),
    weightUnit: z.string().optional(),
    volume: z.number().optional(),
    volumeUnit: z.string().optional(),
    hsnCode: z.string().optional(),
    displayName: z.string().optional(),
    priceInTargetCurrency: z.number().optional(),
    purchasePriceCurrency: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/product/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const product = providerResponse.value;

        return {
            id: product.id,
            ...(product.version != null && { version: product.version }),
            ...(product.url != null && { url: product.url }),
            ...(product.name != null && { name: product.name }),
            ...(product.number != null && { number: product.number }),
            ...(product.displayNumber != null && { displayNumber: product.displayNumber }),
            ...(product.description != null && { description: product.description }),
            ...(product.orderLineDescription != null && { orderLineDescription: product.orderLineDescription }),
            ...(product.ean != null && { ean: product.ean }),
            ...(product.costExcludingVatCurrency != null && { costExcludingVatCurrency: product.costExcludingVatCurrency }),
            ...(product.expenses != null && { expenses: product.expenses }),
            ...(product.costPrice != null && { costPrice: product.costPrice }),
            ...(product.priceExcludingVatCurrency != null && { priceExcludingVatCurrency: product.priceExcludingVatCurrency }),
            ...(product.priceIncludingVatCurrency != null && { priceIncludingVatCurrency: product.priceIncludingVatCurrency }),
            ...(product.isInactive != null && { isInactive: product.isInactive }),
            ...(product.discountGroup != null && { discountGroup: product.discountGroup }),
            ...(product.productUnit != null && { productUnit: product.productUnit }),
            ...(product.isStockItem != null && { isStockItem: product.isStockItem }),
            ...(product.vatType != null && { vatType: product.vatType }),
            ...(product.currency != null && { currency: product.currency }),
            ...(product.department != null && { department: product.department }),
            ...(product.account != null && { account: product.account }),
            ...(product.discountPrice != null && { discountPrice: product.discountPrice }),
            ...(product.supplier != null && { supplier: product.supplier }),
            ...(product.resaleProduct != null && { resaleProduct: product.resaleProduct }),
            ...(product.hasSupplierProductConnected != null && { hasSupplierProductConnected: product.hasSupplierProductConnected }),
            ...(product.weight != null && { weight: product.weight }),
            ...(product.weightUnit != null && { weightUnit: product.weightUnit }),
            ...(product.volume != null && { volume: product.volume }),
            ...(product.volumeUnit != null && { volumeUnit: product.volumeUnit }),
            ...(product.hsnCode != null && { hsnCode: product.hsnCode }),
            ...(product.displayName != null && { displayName: product.displayName }),
            ...(product.priceInTargetCurrency != null && { priceInTargetCurrency: product.priceInTargetCurrency }),
            ...(product.purchasePriceCurrency != null && { purchasePriceCurrency: product.purchasePriceCurrency })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
