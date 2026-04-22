import { z } from 'zod';
import { createAction } from 'nango';

// Xero Item schema based on Xero Accounting API
// https://developer.xero.com/documentation/api/accounting/items

const InputSchema = z
    .object({
        item_id: z.string().optional().describe('Unique Xero identifier for the item. Example: "c7f1c1b7-4c44-4f8e-8f6e-5d6c5f5c7e7e"'),
        code: z.string().optional().describe('User defined item code (item identifier). Required if ItemID is not provided. Example: "ITEM-001"'),
        name: z.string().optional().describe('The name of the item. Example: "Acme Widget"'),
        description: z.string().optional().describe('The sales description of the item.'),
        purchase_description: z.string().optional().describe('The purchase description of the item.'),
        is_sold: z.boolean().optional().describe('Boolean value, defaults to true. Determines whether the item is sold.'),
        is_purchased: z.boolean().optional().describe('Boolean value, defaults to true. Determines whether the item is purchased.'),
        sales_unit_price: z.number().optional().describe('Unit price for sales.'),
        sales_account_code: z.string().optional().describe('Default sales account code for the item.'),
        sales_tax_type: z.string().optional().describe('The TaxType to apply to the item on sales invoices.'),
        purchase_unit_price: z.number().optional().describe('Unit price for purchases.'),
        purchase_account_code: z.string().optional().describe('Default purchases account code for the item.'),
        purchase_tax_type: z.string().optional().describe('The TaxType to apply to the item on purchase invoices.'),
        inventory_asset_account_code: z.string().optional().describe('The inventory asset account code for the item.'),
        is_tracked_as_inventory: z.boolean().optional().describe('Boolean, defaults to false. When true, the item is tracked as inventory.')
    })
    .refine((data) => data.item_id || data.code, {
        message: 'Either item_id or code is required to identify the item.',
        path: ['item_id']
    });

const SalesDetailsSchema = z.object({
    unit_price: z.number().nullable(),
    account_code: z.string().nullable(),
    tax_type: z.string().nullable(),
    cogs_account_code: z.string().nullable()
});

const PurchaseDetailsSchema = z.object({
    unit_price: z.number().nullable(),
    account_code: z.string().nullable(),
    tax_type: z.string().nullable(),
    cogs_account_code: z.string().nullable()
});

const OutputSchema = z.object({
    item_id: z.string(),
    code: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    purchase_description: z.string().nullable(),
    is_sold: z.boolean(),
    is_purchased: z.boolean(),
    sales_details: SalesDetailsSchema.nullable(),
    purchase_details: PurchaseDetailsSchema.nullable(),
    is_tracked_as_inventory: z.boolean(),
    inventory_asset_account_code: z.string().nullable(),
    status: z.string(),
    updated_date_utc: z.string().nullable()
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
    version: '1.0.0',
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

        if (input.item_id) {
            itemPayload['ItemID'] = input.item_id;
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

        if (input.purchase_description !== undefined) {
            itemPayload['PurchaseDescription'] = input.purchase_description;
        }

        if (input.is_sold !== undefined) {
            itemPayload['IsSold'] = input.is_sold;
        }

        if (input.is_purchased !== undefined) {
            itemPayload['IsPurchased'] = input.is_purchased;
        }

        if (input.sales_unit_price !== undefined || input.sales_account_code !== undefined || input.sales_tax_type !== undefined) {
            const salesDetails: Record<string, unknown> = {};
            if (input.sales_unit_price !== undefined) {
                salesDetails['UnitPrice'] = input.sales_unit_price;
            }
            if (input.sales_account_code !== undefined) {
                salesDetails['AccountCode'] = input.sales_account_code;
            }
            if (input.sales_tax_type !== undefined) {
                salesDetails['TaxType'] = input.sales_tax_type;
            }
            itemPayload['SalesDetails'] = salesDetails;
        }

        if (input.purchase_unit_price !== undefined || input.purchase_account_code !== undefined || input.purchase_tax_type !== undefined) {
            const purchaseDetails: Record<string, unknown> = {};
            if (input.purchase_unit_price !== undefined) {
                purchaseDetails['UnitPrice'] = input.purchase_unit_price;
            }
            if (input.purchase_account_code !== undefined) {
                purchaseDetails['AccountCode'] = input.purchase_account_code;
            }
            if (input.purchase_tax_type !== undefined) {
                purchaseDetails['TaxType'] = input.purchase_tax_type;
            }
            itemPayload['PurchaseDetails'] = purchaseDetails;
        }

        if (input.is_tracked_as_inventory !== undefined) {
            itemPayload['IsTrackedAsInventory'] = input.is_tracked_as_inventory;
        }

        if (input.inventory_asset_account_code !== undefined) {
            itemPayload['InventoryAssetAccountCode'] = input.inventory_asset_account_code;
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
                response_status: xeroResponse.Status ?? 'unknown'
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
                unit_price: typeof unitPrice === 'number' ? unitPrice : null,
                account_code: typeof accountCode === 'string' ? accountCode : null,
                tax_type: typeof taxType === 'string' ? taxType : null,
                cogs_account_code: typeof cogsAccountCode === 'string' ? cogsAccountCode : null
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
                unit_price: typeof unitPrice === 'number' ? unitPrice : null,
                account_code: typeof accountCode === 'string' ? accountCode : null,
                tax_type: typeof taxType === 'string' ? taxType : null,
                cogs_account_code: typeof cogsAccountCode === 'string' ? cogsAccountCode : null
            };
        };

        return {
            item_id: itemId,
            code: getString('Code') ?? '',
            name: getString('Name'),
            description: getString('Description'),
            purchase_description: getString('PurchaseDescription'),
            is_sold: getBool('IsSold'),
            is_purchased: getBool('IsPurchased'),
            sales_details: getSalesDetails(),
            purchase_details: getPurchaseDetails(),
            is_tracked_as_inventory: getBool('IsTrackedAsInventory'),
            inventory_asset_account_code: getString('InventoryAssetAccountCode'),
            status: getString('Status') ?? '',
            updated_date_utc: getString('UpdatedDateUTC')
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
