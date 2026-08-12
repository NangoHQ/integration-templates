import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const SalesDetailsInputSchema = z.object({
    unit_price: z.number().optional().describe('Sales unit price.'),
    account_code: z.string().optional().describe('Sales account code.'),
    tax_type: z.string().optional().describe('Sales tax type.')
});

const PurchaseDetailsInputSchema = z.object({
    unit_price: z.number().optional().describe('Purchase unit price.'),
    account_code: z.string().optional().describe('Purchase account code.'),
    tax_type: z.string().optional().describe('Purchase tax type.')
});

const InputSchema = z
    .object({
        item_id: z.string().optional().describe('The Xero ItemID. Provide either item_id or code.'),
        code: z.string().optional().describe('The item Code. Provide either item_id or code.'),
        name: z.string().optional().describe('Updated item name.'),
        description: z.string().optional().describe('Updated item description.'),
        is_tracked_as_inventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
        is_sold: z.boolean().optional().describe('Whether the item is sold.'),
        is_purchased: z.boolean().optional().describe('Whether the item is purchased.'),
        inventory_asset_account_code: z.string().optional().describe('Account code for inventory tracking.'),
        sales_details: SalesDetailsInputSchema.optional().describe('Sales details for the item.'),
        purchase_details: PurchaseDetailsInputSchema.optional().describe('Purchase details for the item.')
    })
    .describe('Input for updating an existing Xero item.');

const ProviderSalesDetailsSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ProviderPurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ProviderItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string(),
    Name: z.string().optional(),
    Description: z.string().nullable().optional(),
    IsTrackedAsInventory: z.boolean().optional(),
    IsSold: z.boolean().optional(),
    IsPurchased: z.boolean().optional(),
    InventoryAssetAccountCode: z.string().nullable().optional(),
    SalesDetails: ProviderSalesDetailsSchema.nullable().optional(),
    PurchaseDetails: ProviderPurchaseDetailsSchema.nullable().optional()
});

const ProviderValidationErrorSchema = z.object({
    Message: z.string().optional(),
    Description: z.string().optional()
});

const ProviderResponseSchema = z.object({
    Items: z.array(ProviderItemSchema).optional(),
    Status: z.string().optional(),
    ValidationErrors: z.array(ProviderValidationErrorSchema).optional()
});

const SalesDetailsOutputSchema = z.object({
    unit_price: z.number().optional().describe('Sales unit price.'),
    account_code: z.string().optional().describe('Sales account code.'),
    tax_type: z.string().optional().describe('Sales tax type.')
});

const PurchaseDetailsOutputSchema = z.object({
    unit_price: z.number().optional().describe('Purchase unit price.'),
    account_code: z.string().optional().describe('Purchase account code.'),
    tax_type: z.string().optional().describe('Purchase tax type.')
});

const OutputSchema = z
    .object({
        item_id: z.string().describe('The Xero ItemID.'),
        code: z.string().describe('The item Code.'),
        name: z.string().optional().describe('The item name.'),
        description: z.string().optional().describe('The item description.'),
        is_tracked_as_inventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
        is_sold: z.boolean().optional().describe('Whether the item is sold.'),
        is_purchased: z.boolean().optional().describe('Whether the item is purchased.'),
        inventory_asset_account_code: z.string().optional().describe('Account code for inventory tracking.'),
        sales_details: SalesDetailsOutputSchema.optional().describe('Sales details for the item.'),
        purchase_details: PurchaseDetailsOutputSchema.optional().describe('Purchase details for the item.'),
        status: z.string().optional().describe('The validation status from Xero.')
    })
    .describe('Output of the updated Xero item.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing item record in Xero via the Accounting API.
 * @pitfalls: Xero rejects item updates that omit the item Code even when ItemID is provided.
 */
const action = createAction({
    description: 'Update an existing item.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.item_id && !input.code) {
            throw new nango.ActionError({
                type: 'missing_identifier',
                message: 'Either item_id or code is required to identify the item to update.'
            });
        }

        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        const configTenantId = connection.connection_config['tenant_id'];
        if (typeof configTenantId === 'string' && configTenantId.length > 0) {
            tenantId = configTenantId;
        }

        if (!tenantId && connection.metadata !== null) {
            const metadataTenantId = connection.metadata['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                tenantId = metadataTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/scopes/ (Connections endpoint)
            const response = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsSchema = z.array(
                z.object({
                    tenantId: z.string().optional()
                })
            );
            const parsedConnections = connectionsSchema.safeParse(response.data);

            if (!parsedConnections.success || parsedConnections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (parsedConnections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = parsedConnections.data[0];
            if (firstConnection) {
                const fallbackTenantId = firstConnection.tenantId;
                if (typeof fallbackTenantId === 'string' && fallbackTenantId.length > 0) {
                    tenantId = fallbackTenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const itemPayload = {
            ...(input.item_id !== undefined && { ItemID: input.item_id }),
            ...(input.code !== undefined && { Code: input.code }),
            ...(input.name !== undefined && { Name: input.name }),
            ...(input.description !== undefined && { Description: input.description }),
            ...(input.is_tracked_as_inventory !== undefined && { IsTrackedAsInventory: input.is_tracked_as_inventory }),
            ...(input.is_sold !== undefined && { IsSold: input.is_sold }),
            ...(input.is_purchased !== undefined && { IsPurchased: input.is_purchased }),
            ...(input.inventory_asset_account_code !== undefined && { InventoryAssetAccountCode: input.inventory_asset_account_code }),
            ...(input.sales_details !== undefined && {
                SalesDetails: {
                    ...(input.sales_details.unit_price !== undefined && { UnitPrice: input.sales_details.unit_price }),
                    ...(input.sales_details.account_code !== undefined && { AccountCode: input.sales_details.account_code }),
                    ...(input.sales_details.tax_type !== undefined && { TaxType: input.sales_details.tax_type })
                }
            }),
            ...(input.purchase_details !== undefined && {
                PurchaseDetails: {
                    ...(input.purchase_details.unit_price !== undefined && { UnitPrice: input.purchase_details.unit_price }),
                    ...(input.purchase_details.account_code !== undefined && { AccountCode: input.purchase_details.account_code }),
                    ...(input.purchase_details.tax_type !== undefined && { TaxType: input.purchase_details.tax_type })
                }
            })
        };

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/items
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Items: [itemPayload]
            },
            retries: 3
        };
        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        if (parsed.ValidationErrors && parsed.ValidationErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: parsed.ValidationErrors.map((e) => e.Message || e.Description || 'Unknown validation error').join(', ')
            });
        }

        if (!parsed.Items || parsed.Items.length === 0) {
            throw new nango.ActionError({
                type: 'no_items',
                message: 'Xero returned no items in the response.'
            });
        }

        const updated = parsed.Items[0];
        if (!updated) {
            throw new nango.ActionError({
                type: 'no_items',
                message: 'Xero returned no items in the response.'
            });
        }

        const result = {
            item_id: updated.ItemID,
            code: updated.Code,
            ...(parsed.Status !== undefined && { status: parsed.Status }),
            ...(updated.Name !== undefined && { name: updated.Name }),
            ...(updated.Description != null && { description: updated.Description }),
            ...(updated.IsTrackedAsInventory !== undefined && { is_tracked_as_inventory: updated.IsTrackedAsInventory }),
            ...(updated.IsSold !== undefined && { is_sold: updated.IsSold }),
            ...(updated.IsPurchased !== undefined && { is_purchased: updated.IsPurchased }),
            ...(updated.InventoryAssetAccountCode != null && { inventory_asset_account_code: updated.InventoryAssetAccountCode }),
            ...(updated.SalesDetails != null && {
                sales_details: {
                    ...(updated.SalesDetails.UnitPrice !== undefined && { unit_price: updated.SalesDetails.UnitPrice }),
                    ...(updated.SalesDetails.AccountCode !== undefined && { account_code: updated.SalesDetails.AccountCode }),
                    ...(updated.SalesDetails.TaxType !== undefined && { tax_type: updated.SalesDetails.TaxType })
                }
            }),
            ...(updated.PurchaseDetails != null && {
                purchase_details: {
                    ...(updated.PurchaseDetails.UnitPrice !== undefined && { unit_price: updated.PurchaseDetails.UnitPrice }),
                    ...(updated.PurchaseDetails.AccountCode !== undefined && { account_code: updated.PurchaseDetails.AccountCode }),
                    ...(updated.PurchaseDetails.TaxType !== undefined && { tax_type: updated.PurchaseDetails.TaxType })
                }
            })
        };

        return OutputSchema.parse(result);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
