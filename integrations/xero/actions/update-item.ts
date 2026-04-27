import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        item_id: z.string().optional().describe('Xero Item ID. Example: "8bbaf73c-5a32-4458-addf-bd30a36c8551"'),
        code: z.string().optional().describe('Item Code. Example: "BOOK"'),
        name: z.string().optional().describe('The name of the item'),
        is_sold: z.boolean().optional().describe('When true the item will be available on sales transactions'),
        is_purchased: z.boolean().optional().describe('When true the item is available for purchase transactions'),
        description: z.string().optional().describe('The sales description of the item'),
        purchase_description: z.string().optional().describe('The purchase description of the item'),
        purchase_details: z
            .object({
                unit_price: z.number().optional(),
                account_code: z.string().optional(),
                cogs_account_code: z.string().optional(),
                tax_type: z.string().optional()
            })
            .optional(),
        sales_details: z
            .object({
                unit_price: z.number().optional(),
                account_code: z.string().optional(),
                tax_type: z.string().optional()
            })
            .optional()
    })
    .refine((data) => data.item_id || data.code, {
        message: 'Either item_id or code is required to identify the item.'
    });

const PurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    COGSAccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const SalesDetailsSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ProviderItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Description: z.string().optional(),
    PurchaseDescription: z.string().optional(),
    IsSold: z.boolean().optional(),
    IsPurchased: z.boolean().optional(),
    IsTrackedAsInventory: z.boolean().optional(),
    PurchaseDetails: PurchaseDetailsSchema.optional(),
    SalesDetails: SalesDetailsSchema.optional(),
    UpdatedDateUTC: z.string().optional(),
    ValidationErrors: z.array(z.object({ Message: z.string() })).optional()
});

const OutputSchema = z.object({
    item: ProviderItemSchema
});

const ConnectionSchema = z.object({
    connection_config: z.object({ tenant_id: z.string().optional() }).optional(),
    metadata: z.object({ tenantId: z.string().optional() }).optional()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

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
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResult = ConnectionSchema.safeParse(await nango.getConnection());
        if (!connectionResult.success) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'Unable to read connection.',
                errors: connectionResult.error.issues
            });
        }
        const connection = connectionResult.data;

        let tenantId: string | undefined;
        if (connection.connection_config && connection.connection_config.tenant_id) {
            tenantId = connection.connection_config.tenant_id;
        } else if (connection.metadata && connection.metadata.tenantId) {
            tenantId = connection.metadata.tenantId;
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/guides/oauth2/tenants
                endpoint: 'connections',
                retries: 10
            };
            const connectionsResponse = await nango.get(connectionsConfig);
            const connectionsResult = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!connectionsResult.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from Xero connections endpoint.',
                    errors: connectionsResult.error.issues
                });
            }
            const connections = connectionsResult.data;
            if (connections.length === 1) {
                const firstConnection = connections[0];
                if (firstConnection) {
                    tenantId = firstConnection.tenantId;
                }
            } else if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Could not resolve xero-tenant-id. Please set tenant_id in connection_config or tenantId in metadata.'
            });
        }

        const item: {
            ItemID?: string;
            Code?: string;
            Name?: string;
            IsSold?: boolean;
            IsPurchased?: boolean;
            Description?: string;
            PurchaseDescription?: string;
            PurchaseDetails?: {
                UnitPrice?: number;
                AccountCode?: string;
                COGSAccountCode?: string;
                TaxType?: string;
            };
            SalesDetails?: {
                UnitPrice?: number;
                AccountCode?: string;
                TaxType?: string;
            };
        } = {};

        if (input.item_id !== undefined) {
            item.ItemID = input.item_id;
        }
        if (input.code !== undefined) {
            item.Code = input.code;
        }
        if (input.name !== undefined) {
            item.Name = input.name;
        }
        if (input.is_sold !== undefined) {
            item.IsSold = input.is_sold;
        }
        if (input.is_purchased !== undefined) {
            item.IsPurchased = input.is_purchased;
        }
        if (input.description !== undefined) {
            item.Description = input.description;
        }
        if (input.purchase_description !== undefined) {
            item.PurchaseDescription = input.purchase_description;
        }
        if (input.purchase_details !== undefined) {
            item.PurchaseDetails = {};
            if (input.purchase_details.unit_price !== undefined) {
                item.PurchaseDetails.UnitPrice = input.purchase_details.unit_price;
            }
            if (input.purchase_details.account_code !== undefined) {
                item.PurchaseDetails.AccountCode = input.purchase_details.account_code;
            }
            if (input.purchase_details.cogs_account_code !== undefined) {
                item.PurchaseDetails.COGSAccountCode = input.purchase_details.cogs_account_code;
            }
            if (input.purchase_details.tax_type !== undefined) {
                item.PurchaseDetails.TaxType = input.purchase_details.tax_type;
            }
        }
        if (input.sales_details !== undefined) {
            item.SalesDetails = {};
            if (input.sales_details.unit_price !== undefined) {
                item.SalesDetails.UnitPrice = input.sales_details.unit_price;
            }
            if (input.sales_details.account_code !== undefined) {
                item.SalesDetails.AccountCode = input.sales_details.account_code;
            }
            if (input.sales_details.tax_type !== undefined) {
                item.SalesDetails.TaxType = input.sales_details.tax_type;
            }
        }

        const postConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/items
            endpoint: 'api.xro/2.0/Items',
            data: {
                Items: [item]
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };
        const response = await nango.post(postConfig);

        const providerResponseResult = z
            .object({
                Items: z.array(ProviderItemSchema)
            })
            .safeParse(response.data);
        if (!providerResponseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Xero when updating item.',
                errors: providerResponseResult.error.issues
            });
        }

        const updatedItem = providerResponseResult.data.Items[0];
        if (!updatedItem) {
            throw new nango.ActionError({
                type: 'no_item_returned',
                message: 'No item returned from Xero after update.'
            });
        }

        if (updatedItem.ValidationErrors && updatedItem.ValidationErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: updatedItem.ValidationErrors.map((e) => e.Message).join(', ')
            });
        }

        return {
            item: updatedItem
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
