import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(255).describe('Product name. Example: "Office Chair"'),
    number: z.string().max(100).optional().describe('Product number. Example: "P-001"'),
    description: z.string().max(16777215).optional().describe('Product description.'),
    orderLineDescription: z.string().max(255).optional().describe('Description shown on order lines.'),
    ean: z.string().max(14).optional().describe('EAN barcode. Example: "1234567890123"'),
    isInactive: z.boolean().optional().describe('Whether the product is inactive.'),
    isStockItem: z.boolean().optional().describe('Whether the product is a stock item.'),
    costExcludingVatCurrency: z.number().optional().describe('Purchase cost excluding VAT in the product currency.'),
    priceExcludingVatCurrency: z.number().optional().describe('Sales price excluding VAT in the product currency.'),
    priceIncludingVatCurrency: z.number().optional().describe('Sales price including VAT in the product currency.'),
    vatTypeId: z.number().optional().describe('VAT type ID. Example: 1'),
    currencyId: z.number().optional().describe('Currency ID. Example: 1'),
    departmentId: z.number().optional().describe('Department ID. Example: 553503'),
    accountId: z.number().optional().describe('Ledger account ID. Example: 291297300'),
    productUnitId: z.number().optional().describe('Product unit ID. Example: 1'),
    supplierId: z.number().optional().describe('Supplier ID. Example: 93640706'),
    weight: z.number().optional().describe('Product weight.'),
    weightUnit: z.enum(['kg', 'g', 'hg']).optional().describe('Weight unit.'),
    volume: z.number().optional().describe('Product volume.'),
    volumeUnit: z.enum(['cm3', 'dm3', 'm3']).optional().describe('Volume unit.'),
    hsnCode: z.string().max(20).optional().describe('HSN code.')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    displayNumber: z.string().optional(),
    description: z.string().optional(),
    orderLineDescription: z.string().optional(),
    ean: z.string().optional(),
    costExcludingVatCurrency: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    priceIncludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional(),
    isStockItem: z.boolean().optional(),
    weight: z.number().optional(),
    weightUnit: z.enum(['kg', 'g', 'hg']).optional(),
    volume: z.number().optional(),
    volumeUnit: z.enum(['cm3', 'dm3', 'm3']).optional(),
    hsnCode: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderProductSchema
});

const OutputSchema = z.object({
    id: z.number().describe('Product ID. Example: 69781078'),
    version: z.number().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    displayNumber: z.string().optional(),
    description: z.string().optional(),
    orderLineDescription: z.string().optional(),
    ean: z.string().optional(),
    costExcludingVatCurrency: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    priceIncludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional(),
    isStockItem: z.boolean().optional(),
    weight: z.number().optional(),
    weightUnit: z.enum(['kg', 'g', 'hg']).optional(),
    volume: z.number().optional(),
    volumeUnit: z.enum(['cm3', 'dm3', 'm3']).optional(),
    hsnCode: z.string().optional()
});

const action = createAction({
    description: 'Create a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Tripletex API v2'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name
        };

        if (input.number !== undefined) {
            body['number'] = input.number;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.orderLineDescription !== undefined) {
            body['orderLineDescription'] = input.orderLineDescription;
        }
        if (input.ean !== undefined) {
            body['ean'] = input.ean;
        }
        if (input.isInactive !== undefined) {
            body['isInactive'] = input.isInactive;
        }
        if (input.isStockItem !== undefined) {
            body['isStockItem'] = input.isStockItem;
        }
        if (input.costExcludingVatCurrency !== undefined) {
            body['costExcludingVatCurrency'] = input.costExcludingVatCurrency;
        }
        if (input.priceExcludingVatCurrency !== undefined) {
            body['priceExcludingVatCurrency'] = input.priceExcludingVatCurrency;
        }
        if (input.priceIncludingVatCurrency !== undefined) {
            body['priceIncludingVatCurrency'] = input.priceIncludingVatCurrency;
        }
        if (input.vatTypeId !== undefined) {
            body['vatType'] = { id: input.vatTypeId };
        }
        if (input.currencyId !== undefined) {
            body['currency'] = { id: input.currencyId };
        }
        if (input.departmentId !== undefined) {
            body['department'] = { id: input.departmentId };
        }
        if (input.accountId !== undefined) {
            body['account'] = { id: input.accountId };
        }
        if (input.productUnitId !== undefined) {
            body['productUnit'] = { id: input.productUnitId };
        }
        if (input.supplierId !== undefined) {
            body['supplier'] = { id: input.supplierId };
        }
        if (input.weight !== undefined) {
            body['weight'] = input.weight;
        }
        if (input.weightUnit !== undefined) {
            body['weightUnit'] = input.weightUnit;
        }
        if (input.volume !== undefined) {
            body['volume'] = input.volume;
        }
        if (input.volumeUnit !== undefined) {
            body['volumeUnit'] = input.volumeUnit;
        }
        if (input.hsnCode !== undefined) {
            body['hsnCode'] = input.hsnCode;
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.post({
            endpoint: 'v2/product',
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const product = parsed.value;

        return {
            id: product.id,
            ...(product.version !== undefined && { version: product.version }),
            ...(product.name !== undefined && { name: product.name }),
            ...(product.number !== undefined && { number: product.number }),
            ...(product.displayNumber !== undefined && { displayNumber: product.displayNumber }),
            ...(product.description !== undefined && { description: product.description }),
            ...(product.orderLineDescription !== undefined && { orderLineDescription: product.orderLineDescription }),
            ...(product.ean !== undefined && { ean: product.ean }),
            ...(product.costExcludingVatCurrency !== undefined && { costExcludingVatCurrency: product.costExcludingVatCurrency }),
            ...(product.priceExcludingVatCurrency !== undefined && { priceExcludingVatCurrency: product.priceExcludingVatCurrency }),
            ...(product.priceIncludingVatCurrency !== undefined && { priceIncludingVatCurrency: product.priceIncludingVatCurrency }),
            ...(product.isInactive !== undefined && { isInactive: product.isInactive }),
            ...(product.isStockItem !== undefined && { isStockItem: product.isStockItem }),
            ...(product.weight !== undefined && { weight: product.weight }),
            ...(product.weightUnit !== undefined && { weightUnit: product.weightUnit }),
            ...(product.volume !== undefined && { volume: product.volume }),
            ...(product.volumeUnit !== undefined && { volumeUnit: product.volumeUnit }),
            ...(product.hsnCode !== undefined && { hsnCode: product.hsnCode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
