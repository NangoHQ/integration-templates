import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const ReleasedProductsV2ItemSchema = z
    .object({
        ItemNumber: z.string(),
        ProductNumber: z.unknown().optional(),
        SearchName: z.unknown().optional(),
        ProductSubType: z.unknown().optional(),
        InventoryUnitSymbol: z.unknown().optional(),
        SalesUnitSymbol: z.unknown().optional(),
        PurchUnitSymbol: z.unknown().optional(),
        ItemGroup: z.unknown().optional(),
        ItemModelGroupId: z.unknown().optional(),
        SalesPrice: z.unknown().optional(),
        PurchasePrice: z.unknown().optional(),
        UnitCost: z.unknown().optional(),
        PrimaryVendorAccountNumber: z.unknown().optional(),
        CostCalculationGroupId: z.unknown().optional()
    })
    .passthrough();

const ReleasedProductSchema = z.object({
    id: z.string(),
    item_number: z.string(),
    product_number: z.string().optional(),
    search_name: z.string().optional(),
    product_subtype: z.string().optional(),
    inventory_unit_symbol: z.string().optional(),
    sales_unit_symbol: z.string().optional(),
    purchase_unit_symbol: z.string().optional(),
    item_group: z.string().optional(),
    item_model_group_id: z.string().optional(),
    sales_price: z.number().optional(),
    purchase_price: z.number().optional(),
    unit_cost: z.number().optional(),
    primary_vendor_account_number: z.string().optional(),
    cost_calculation_group_id: z.string().optional()
});

function toOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync released products (items) from ReleasedProductsV2.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ReleasedProduct: ReleasedProductSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        if (skip === 0) {
            await nango.trackDeletesStart('ReleasedProduct');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/ReleasedProductsV2',
            params: {
                $orderby: 'ItemNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const releasedProducts = page.map((raw: unknown) => {
                const parsed = ReleasedProductsV2ItemSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ReleasedProductsV2 item: ${parsed.error.message}`);
                }

                const item = parsed.data;
                return {
                    id: item.ItemNumber,
                    item_number: item.ItemNumber,
                    product_number: toOptionalString(item.ProductNumber),
                    search_name: toOptionalString(item.SearchName),
                    product_subtype: toOptionalString(item.ProductSubType),
                    inventory_unit_symbol: toOptionalString(item.InventoryUnitSymbol),
                    sales_unit_symbol: toOptionalString(item.SalesUnitSymbol),
                    purchase_unit_symbol: toOptionalString(item.PurchUnitSymbol),
                    item_group: toOptionalString(item.ItemGroup),
                    item_model_group_id: toOptionalString(item.ItemModelGroupId),
                    sales_price: toOptionalNumber(item.SalesPrice),
                    purchase_price: toOptionalNumber(item.PurchasePrice),
                    unit_cost: toOptionalNumber(item.UnitCost),
                    primary_vendor_account_number: toOptionalString(item.PrimaryVendorAccountNumber),
                    cost_calculation_group_id: toOptionalString(item.CostCalculationGroupId)
                };
            });

            if (releasedProducts.length > 0) {
                await nango.batchSave(releasedProducts, 'ReleasedProduct');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ReleasedProduct');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
