import { z } from 'zod';
import { createAction } from 'nango';

const PurchaseDetailsInputSchema = z.object({
    unitPrice: z.number().optional().describe('Unit price for purchase.'),
    accountCode: z.string().optional().describe('Account code for purchase.'),
    cogsAccountCode: z.string().optional().describe('Cost of goods sold account code for purchase.'),
    taxType: z.string().optional().describe('Tax type for purchase.')
});

const SalesDetailsInputSchema = z.object({
    unitPrice: z.number().optional().describe('Unit price for sale.'),
    accountCode: z.string().optional().describe('Account code for sale.'),
    cogsAccountCode: z.string().optional().describe('Cost of goods sold account code for sale.'),
    taxType: z.string().optional().describe('Tax type for sale.')
});

const InputSchema = z.object({
    code: z.string().describe('Unique item code. Example: "ITEM-001"'),
    name: z.string().optional().describe('Name of the item.'),
    description: z.string().optional().describe('Description of the item.'),
    inventoryAssetAccountCode: z.string().optional().describe('Inventory asset account code for tracked inventory items.'),
    isSold: z.boolean().optional().describe('Whether the item is sold.'),
    isPurchased: z.boolean().optional().describe('Whether the item is purchased.'),
    isTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
    purchaseDetails: PurchaseDetailsInputSchema.optional().describe('Purchase details for the item.'),
    salesDetails: SalesDetailsInputSchema.optional().describe('Sales details for the item.')
});

const PurchaseDetailsOutputSchema = z.object({
    unitPrice: z.number().optional(),
    accountCode: z.string().optional(),
    cogsAccountCode: z.string().optional(),
    taxType: z.string().optional()
});

const SalesDetailsOutputSchema = z.object({
    unitPrice: z.number().optional(),
    accountCode: z.string().optional(),
    cogsAccountCode: z.string().optional(),
    taxType: z.string().optional()
});

const OutputSchema = z.object({
    itemId: z.string().describe('Unique identifier of the created item.'),
    code: z.string().describe('Item code.'),
    name: z.string().optional().describe('Item name.'),
    description: z.string().optional().describe('Item description.'),
    inventoryAssetAccountCode: z.string().optional().describe('Inventory asset account code.'),
    isSold: z.boolean().optional().describe('Whether the item is sold.'),
    isPurchased: z.boolean().optional().describe('Whether the item is purchased.'),
    isTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
    purchaseDetails: PurchaseDetailsOutputSchema.optional().describe('Purchase details.'),
    salesDetails: SalesDetailsOutputSchema.optional().describe('Sales details.'),
    updatedDateUTC: z.string().optional().describe('UTC timestamp of the last update.')
});

const ConnectionSchema = z.object({
    connection_config: z.unknown().optional(),
    metadata: z.unknown().optional()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const ProviderItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string(),
    Name: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    InventoryAssetAccountCode: z.string().nullable().optional(),
    IsSold: z.boolean().nullable().optional(),
    IsPurchased: z.boolean().nullable().optional(),
    IsTrackedAsInventory: z.boolean().nullable().optional(),
    PurchaseDetails: z
        .object({
            UnitPrice: z.number().nullable().optional(),
            AccountCode: z.string().nullable().optional(),
            COGSAccountCode: z.string().nullable().optional(),
            TaxType: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    SalesDetails: z
        .object({
            UnitPrice: z.number().nullable().optional(),
            AccountCode: z.string().nullable().optional(),
            COGSAccountCode: z.string().nullable().optional(),
            TaxType: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    UpdatedDateUTC: z.string().nullable().optional()
});

const ProviderItemsResponseSchema = z.object({
    Items: z.array(z.unknown()).optional()
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = ConnectionSchema.parse(await nango.getConnection());
    const configObj = typeof connection.connection_config === 'object' && connection.connection_config !== null ? connection.connection_config : {};
    const configTenant = 'tenant_id' in configObj && typeof configObj['tenant_id'] === 'string' ? configObj['tenant_id'] : undefined;
    if (typeof configTenant === 'string' && configTenant.length > 0) {
        return configTenant;
    }

    const metaObj = typeof connection.metadata === 'object' && connection.metadata !== null ? connection.metadata : {};
    const metaTenant = 'tenantId' in metaObj && typeof metaObj['tenantId'] === 'string' ? metaObj['tenantId'] : undefined;
    if (typeof metaTenant === 'string' && metaTenant.length > 0) {
        return metaTenant;
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connections = ConnectionsResponseSchema.parse(response.data);

    if (connections.data.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (connections.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstTenant = connections.data[0];
    if (firstTenant && typeof firstTenant === 'object' && 'tenantId' in firstTenant && typeof firstTenant['tenantId'] === 'string') {
        return firstTenant['tenantId'];
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve tenantId from connections.'
    });
}

function buildProviderItem(input: z.infer<typeof InputSchema>): unknown {
    const item: Record<string, unknown> = {
        Code: input.code
    };

    if (input.name !== undefined) {
        item['Name'] = input.name;
    }
    if (input.description !== undefined) {
        item['Description'] = input.description;
    }
    if (input.inventoryAssetAccountCode !== undefined) {
        item['InventoryAssetAccountCode'] = input.inventoryAssetAccountCode;
    }
    if (input.isSold !== undefined) {
        item['IsSold'] = input.isSold;
    }
    if (input.isPurchased !== undefined) {
        item['IsPurchased'] = input.isPurchased;
    }
    if (input.isTrackedAsInventory !== undefined) {
        item['IsTrackedAsInventory'] = input.isTrackedAsInventory;
    }

    if (input.purchaseDetails !== undefined) {
        const pd: Record<string, unknown> = {};
        if (input.purchaseDetails.unitPrice !== undefined) {
            pd['UnitPrice'] = input.purchaseDetails.unitPrice;
        }
        if (input.purchaseDetails.accountCode !== undefined) {
            pd['AccountCode'] = input.purchaseDetails.accountCode;
        }
        if (input.purchaseDetails.cogsAccountCode !== undefined) {
            pd['COGSAccountCode'] = input.purchaseDetails.cogsAccountCode;
        }
        if (input.purchaseDetails.taxType !== undefined) {
            pd['TaxType'] = input.purchaseDetails.taxType;
        }
        item['PurchaseDetails'] = pd;
    }

    if (input.salesDetails !== undefined) {
        const sd: Record<string, unknown> = {};
        if (input.salesDetails.unitPrice !== undefined) {
            sd['UnitPrice'] = input.salesDetails.unitPrice;
        }
        if (input.salesDetails.accountCode !== undefined) {
            sd['AccountCode'] = input.salesDetails.accountCode;
        }
        if (input.salesDetails.cogsAccountCode !== undefined) {
            sd['COGSAccountCode'] = input.salesDetails.cogsAccountCode;
        }
        if (input.salesDetails.taxType !== undefined) {
            sd['TaxType'] = input.salesDetails.taxType;
        }
        item['SalesDetails'] = sd;
    }

    return item;
}

function mapProviderItemToOutput(item: z.infer<typeof ProviderItemSchema>): z.infer<typeof OutputSchema> {
    const output: Record<string, unknown> = {
        itemId: item.ItemID,
        code: item.Code
    };

    if (item.Name != null) {
        output['name'] = item.Name;
    }
    if (item.Description != null) {
        output['description'] = item.Description;
    }
    if (item.InventoryAssetAccountCode != null) {
        output['inventoryAssetAccountCode'] = item.InventoryAssetAccountCode;
    }
    if (item.IsSold != null) {
        output['isSold'] = item.IsSold;
    }
    if (item.IsPurchased != null) {
        output['isPurchased'] = item.IsPurchased;
    }
    if (item.IsTrackedAsInventory != null) {
        output['isTrackedAsInventory'] = item.IsTrackedAsInventory;
    }
    if (item.UpdatedDateUTC != null) {
        output['updatedDateUTC'] = item.UpdatedDateUTC;
    }

    if (item.PurchaseDetails != null) {
        const pd: Record<string, unknown> = {};
        if (item.PurchaseDetails.UnitPrice != null) {
            pd['unitPrice'] = item.PurchaseDetails.UnitPrice;
        }
        if (item.PurchaseDetails.AccountCode != null) {
            pd['accountCode'] = item.PurchaseDetails.AccountCode;
        }
        if (item.PurchaseDetails.COGSAccountCode != null) {
            pd['cogsAccountCode'] = item.PurchaseDetails.COGSAccountCode;
        }
        if (item.PurchaseDetails.TaxType != null) {
            pd['taxType'] = item.PurchaseDetails.TaxType;
        }
        output['purchaseDetails'] = pd;
    }

    if (item.SalesDetails != null) {
        const sd: Record<string, unknown> = {};
        if (item.SalesDetails.UnitPrice != null) {
            sd['unitPrice'] = item.SalesDetails.UnitPrice;
        }
        if (item.SalesDetails.AccountCode != null) {
            sd['accountCode'] = item.SalesDetails.AccountCode;
        }
        if (item.SalesDetails.COGSAccountCode != null) {
            sd['cogsAccountCode'] = item.SalesDetails.COGSAccountCode;
        }
        if (item.SalesDetails.TaxType != null) {
            sd['taxType'] = item.SalesDetails.TaxType;
        }
        output['salesDetails'] = sd;
    }

    return OutputSchema.parse(output);
}

const action = createAction({
    description: 'Create an inventory or catalog item.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);
        const item = buildProviderItem(input);

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Items: [item]
            },
            retries: 3
        });

        const parsed = ProviderItemsResponseSchema.parse(response.data);
        const items = parsed.Items;

        if (!items || items.length === 0) {
            throw new nango.ActionError({
                type: 'no_item_created',
                message: 'Xero did not return any items in the response.'
            });
        }

        const firstItem = ProviderItemSchema.parse(items[0]);
        return mapProviderItemToOutput(firstItem);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
