import { z } from 'zod';
import { createAction } from 'nango';

// Xero Item schema based on Xero Accounting API
// https://developer.xero.com/documentation/api/accounting/items

const InputSchema = z
    .object({
        itemId: z.string().optional().describe('Unique Xero identifier for the item. Example: "c7f1c1b7-4c44-4f8e-8f6e-5d6c5f5c7e7e"'),
        code: z.string().optional().describe('User defined item code (item identifier). Required if ItemID is not provided. Example: "ITEM-001"'),
        name: z.string().optional().describe('The name of the item. Example: "Acme Widget"'),
        description: z.string().optional().describe('The sales description of the item.'),
        purchaseDescription: z.string().optional().describe('The purchase description of the item.'),
        isSold: z.boolean().optional().describe('Boolean value, defaults to true. Determines whether the item is sold.'),
        isPurchased: z.boolean().optional().describe('Boolean value, defaults to true. Determines whether the item is purchased.'),
        salesUnitPrice: z.number().optional().describe('Unit price for sales.'),
        salesAccountCode: z.string().optional().describe('Default sales account code for the item.'),
        salesTaxType: z.string().optional().describe('The TaxType to apply to the item on sales invoices.'),
        purchaseUnitPrice: z.number().optional().describe('Unit price for purchases.'),
        purchaseAccountCode: z.string().optional().describe('Default purchases account code for the item.'),
        purchaseTaxType: z.string().optional().describe('The TaxType to apply to the item on purchase invoices.'),
        inventoryAssetAccountCode: z.string().optional().describe('The inventory asset account code for the item.'),
        isTrackedAsInventory: z.boolean().optional().describe('Boolean, defaults to false. When true, the item is tracked as inventory.')
    })
    .refine((data) => data.itemId || data.code, {
        message: 'Either itemId or code is required to identify the item.',
        path: ['itemId']
    });

const SalesDetailsSchema = z.object({
    unitPrice: z.number().nullable(),
    accountCode: z.string().nullable(),
    taxType: z.string().nullable(),
    cogsAccountCode: z.string().nullable()
});

const PurchaseDetailsSchema = z.object({
    unitPrice: z.number().nullable(),
    accountCode: z.string().nullable(),
    taxType: z.string().nullable(),
    cogsAccountCode: z.string().nullable()
});

const OutputSchema = z.object({
    itemId: z.string(),
    code: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    purchaseDescription: z.string().nullable(),
    isSold: z.boolean(),
    isPurchased: z.boolean(),
    salesDetails: SalesDetailsSchema.nullable(),
    purchaseDetails: PurchaseDetailsSchema.nullable(),
    isTrackedAsInventory: z.boolean(),
    inventoryAssetAccountCode: z.string().nullable(),
    status: z.string(),
    updatedDateUtc: z.string().nullable()
});

// Type inference from schemas
type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

// Type for Xero API response validation
const XeroItemResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    Items: z.array(z.record(z.string(), z.unknown()), {}).optional()
});

// Helper to check if a value is a non-null object
function isObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === 'object';
}

const action = createAction({
    description: 'Update an existing item.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.settings'],

    exec: async (nango, input: Input): Promise<Output> => {
        // Resolve tenant ID
        const connection = await nango.getConnection();

        // Helper to safely access string values from connection config/metadata
        const getStringFromRecord = (obj: unknown, key: string): string | undefined => {
            if (!isObject(obj)) {
                return undefined;
            }
            const val = obj[key];
            return typeof val === 'string' ? val : undefined;
        };

        // 1. Check connection_config['tenant_id']
        let tenantId = getStringFromRecord(connection.connection_config, 'tenant_id');

        // 2. Check metadata['tenantId']
        if (!tenantId) {
            tenantId = getStringFromRecord(connection.metadata, 'tenantId');
        }

        // 3. Call GET connections and use connections.data[0]['tenantId']
        // https://developer.xero.com/documentation/guides/oauth2/connections
        if (!tenantId) {
            const connectionsResponse = await nango.get({
                endpoint: 'https://api.xero.com/connections',
                retries: 10
            });

            // Validate the connections response structure
            if (!isObject(connectionsResponse.data)) {
                throw new Error('Failed to retrieve Xero connections');
            }

            const data = connectionsResponse.data['data'];
            if (!Array.isArray(data)) {
                throw new Error('Failed to retrieve Xero connections');
            }

            if (data.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }

            if (data.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = data[0];
            if (!isObject(firstConnection)) {
                throw new Error('Failed to resolve tenant ID from connections.');
            }

            const resolvedTenantId = firstConnection['tenantId'];
            if (!resolvedTenantId || typeof resolvedTenantId !== 'string') {
                throw new Error('Failed to resolve tenant ID from connections.');
            }

            tenantId = resolvedTenantId;
        }

        // Build the item payload for update
        // The Xero API expects an array of items, and each item must include
        // either ItemID or Code to identify it, plus any fields to update
        const itemPayload: Record<string, unknown> = {};

        if (input.itemId) {
            itemPayload['ItemID'] = input.itemId;
        }

        if (input.code) {
            itemPayload['Code'] = input.code;
        }

        if (input.name !== undefined) {
            itemPayload['Name'] = input.name;
        }

        if (input.description !== undefined) {
            itemPayload['Description'] = input.description;
        }

        if (input.purchaseDescription !== undefined) {
            itemPayload['PurchaseDescription'] = input.purchaseDescription;
        }

        if (input.isSold !== undefined) {
            itemPayload['IsSold'] = input.isSold;
        }

        if (input.isPurchased !== undefined) {
            itemPayload['IsPurchased'] = input.isPurchased;
        }

        if (input.salesUnitPrice !== undefined || input.salesAccountCode !== undefined || input.salesTaxType !== undefined) {
            const salesDetails: Record<string, unknown> = {};
            if (input.salesUnitPrice !== undefined) {
                salesDetails['UnitPrice'] = input.salesUnitPrice;
            }
            if (input.salesAccountCode !== undefined) {
                salesDetails['AccountCode'] = input.salesAccountCode;
            }
            if (input.salesTaxType !== undefined) {
                salesDetails['TaxType'] = input.salesTaxType;
            }
            itemPayload['SalesDetails'] = salesDetails;
        }

        if (input.purchaseUnitPrice !== undefined || input.purchaseAccountCode !== undefined || input.purchaseTaxType !== undefined) {
            const purchaseDetails: Record<string, unknown> = {};
            if (input.purchaseUnitPrice !== undefined) {
                purchaseDetails['UnitPrice'] = input.purchaseUnitPrice;
            }
            if (input.purchaseAccountCode !== undefined) {
                purchaseDetails['AccountCode'] = input.purchaseAccountCode;
            }
            if (input.purchaseTaxType !== undefined) {
                purchaseDetails['TaxType'] = input.purchaseTaxType;
            }
            itemPayload['PurchaseDetails'] = purchaseDetails;
        }

        if (input.isTrackedAsInventory !== undefined) {
            itemPayload['IsTrackedAsInventory'] = input.isTrackedAsInventory;
        }

        if (input.inventoryAssetAccountCode !== undefined) {
            itemPayload['InventoryAssetAccountCode'] = input.inventoryAssetAccountCode;
        }

        const requestBody = {
            Items: [itemPayload]
        };

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: requestBody,
            retries: 3
        });

        const parsedResponse = XeroItemResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to parse Xero API response.'
            });
        }

        const xeroResponse = parsedResponse.data;

        if (!xeroResponse.Items || xeroResponse.Items.length === 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update item. No item returned in response.',
                responseStatus: xeroResponse.Status ?? 'unknown'
            });
        }

        const updatedItem = xeroResponse.Items[0];

        if (!isObject(updatedItem)) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update item. Invalid item in response.'
            });
        }

        const itemId = updatedItem['ItemID'];
        if (!itemId || typeof itemId !== 'string') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update item. Response missing ItemID.'
            });
        }

        const getString = (key: string): string | null => {
            const val = updatedItem[key];
            return typeof val === 'string' ? val : null;
        };

        const getBool = (key: string): boolean => {
            const val = updatedItem[key];
            return typeof val === 'boolean' ? val : false;
        };

        const getSalesDetails = () => {
            const sd = updatedItem['SalesDetails'];
            if (!isObject(sd)) {
                return null;
            }
            const unitPrice = sd['UnitPrice'];
            const accountCode = sd['AccountCode'];
            const taxType = sd['TaxType'];
            const cogsAccountCode = sd['COGSAccountCode'];
            return {
                unitPrice: typeof unitPrice === 'number' ? unitPrice : null,
                accountCode: typeof accountCode === 'string' ? accountCode : null,
                taxType: typeof taxType === 'string' ? taxType : null,
                cogsAccountCode: typeof cogsAccountCode === 'string' ? cogsAccountCode : null
            };
        };

        const getPurchaseDetails = () => {
            const pd = updatedItem['PurchaseDetails'];
            if (!isObject(pd)) {
                return null;
            }
            const unitPrice = pd['UnitPrice'];
            const accountCode = pd['AccountCode'];
            const taxType = pd['TaxType'];
            const cogsAccountCode = pd['COGSAccountCode'];
            return {
                unitPrice: typeof unitPrice === 'number' ? unitPrice : null,
                accountCode: typeof accountCode === 'string' ? accountCode : null,
                taxType: typeof taxType === 'string' ? taxType : null,
                cogsAccountCode: typeof cogsAccountCode === 'string' ? cogsAccountCode : null
            };
        };

        return {
            itemId: itemId,
            code: getString('Code') ?? '',
            name: getString('Name'),
            description: getString('Description'),
            purchaseDescription: getString('PurchaseDescription'),
            isSold: getBool('IsSold'),
            isPurchased: getBool('IsPurchased'),
            salesDetails: getSalesDetails(),
            purchaseDetails: getPurchaseDetails(),
            isTrackedAsInventory: getBool('IsTrackedAsInventory'),
            inventoryAssetAccountCode: getString('InventoryAssetAccountCode'),
            status: getString('Status') ?? '',
            updatedDateUtc: getString('UpdatedDateUTC')
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
