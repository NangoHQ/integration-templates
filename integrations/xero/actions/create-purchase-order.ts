import { z } from 'zod';
import { createAction } from 'nango';

// https://developer.xero.com/documentation/api/accounting/purchaseorders
const ContactSchema = z.object({
    contact_id: z.string().describe('Xero Contact ID. Example: "a3d8b6c0-1234-5678-9abc-def012345678"')
});

const LineItemSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office Supplies"'),
    quantity: z.number().describe('Quantity of items. Example: 5'),
    unit_amount: z.number().describe('Price per unit. Example: 25.5'),
    account_code: z.string().optional().describe('Account code for this line item. Example: "200"'),
    tax_type: z.string().optional().describe('Tax type for this line item. Example: "NONE"'),
    item_code: z.string().optional().describe('Item code if referencing an existing item. Example: "ITM001"')
});

const InputSchema = z.object({
    contact: ContactSchema.describe('Contact information for the purchase order'),
    date: z.string().describe('Purchase order date in YYYY-MM-DD format. Example: "2025-01-15"'),
    line_items: z.array(LineItemSchema).min(1).describe('Line items for the purchase order'),
    delivery_date: z.string().optional().describe('Expected delivery date in YYYY-MM-DD format. Example: "2025-02-01"'),
    reference: z.string().optional().describe('Reference for the purchase order. Example: "PO-001"'),
    attention_to: z.string().optional().describe('Person to address the purchase order to. Example: "John Smith"'),
    telephone: z.string().optional().describe('Contact phone number. Example: "+61 2 9876 5432"'),
    delivery_instructions: z.string().optional().describe('Delivery instructions. Example: "Deliver to rear entrance"'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED', 'DELETED']).optional().describe('Purchase order status. Example: "DRAFT"')
});

const OutputSchema = z.object({
    purchase_order_id: z.string().describe('Xero Purchase Order ID'),
    purchase_order_number: z.union([z.string(), z.null()]).describe('Xero Purchase Order Number'),
    status: z.string().describe('Purchase order status'),
    contact_id: z.string().describe('Contact ID associated with the purchase order'),
    contact_name: z.union([z.string(), z.null()]).describe('Contact name'),
    date: z.string().describe('Purchase order date'),
    line_items: z
        .array(
            z.object({
                description: z.string(),
                quantity: z.number(),
                unit_amount: z.number(),
                line_amount: z.union([z.number(), z.null()]),
                account_code: z.union([z.string(), z.null()]),
                tax_type: z.union([z.string(), z.null()])
            })
        )
        .describe('Line items'),
    total: z.union([z.number(), z.null()]).describe('Total amount'),
    sub_total: z.union([z.number(), z.null()]).describe('Subtotal amount'),
    total_tax: z.union([z.number(), z.null()]).describe('Total tax amount'),
    updated_date_utc: z.union([z.string(), z.null()]).describe('Last updated timestamp')
});

const ConnectionsResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            tenantId: z.string(),
            tenantName: z.string().optional()
        })
    )
});

const PurchaseOrderResponseSchema = z.object({
    PurchaseOrders: z.array(
        z.object({
            PurchaseOrderID: z.string(),
            PurchaseOrderNumber: z.union([z.string(), z.null()]),
            Status: z.string(),
            Contact: z.object({
                ContactID: z.string(),
                Name: z.union([z.string(), z.null()]).optional()
            }),
            Date: z.string(),
            LineItems: z
                .array(
                    z.object({
                        Description: z.string(),
                        Quantity: z.number(),
                        UnitAmount: z.number(),
                        LineAmount: z.union([z.number(), z.null()]).optional(),
                        AccountCode: z.union([z.string(), z.null()]).optional(),
                        TaxType: z.union([z.string(), z.null()]).optional()
                    })
                )
                .optional(),
            Total: z.union([z.number(), z.null()]).optional(),
            SubTotal: z.union([z.number(), z.null()]).optional(),
            TotalTax: z.union([z.number(), z.null()]).optional(),
            UpdatedDateUTC: z.union([z.string(), z.null()]).optional()
        })
    )
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<{
        connection_config?: Record<string, unknown>;
        metadata?: Record<string, unknown> | null;
    }>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
    ActionError: new (payload: Record<string, unknown>) => Error;
}): Promise<string> {
    const connection = await nango.getConnection();

    // Check connection_config['tenant_id'] first (preferred for single-tenant connections)
    const tenantIdFromConfig = connection.connection_config?.['tenant_id'];
    if (typeof tenantIdFromConfig === 'string') {
        return tenantIdFromConfig;
    }

    // Check metadata['tenantId'] second (set externally by get-tenants action)
    const tenantIdFromMetadata = connection.metadata?.['tenantId'];
    if (typeof tenantIdFromMetadata === 'string') {
        return tenantIdFromMetadata;
    }

    // Fall back to calling GET connections endpoint
    // https://developer.xero.com/documentation/api/overview/connections
    const connections = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsed = ConnectionsResponseSchema.safeParse(connections.data);
    if (!parsed.success || parsed.data.data.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant_found',
            message: 'No Xero tenant found. Please configure a tenant_id in connection_config or metadata.'
        });
    }

    if (parsed.data.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = parsed.data.data[0];
    if (!firstConnection) {
        throw new nango.ActionError({
            type: 'no_tenant_found',
            message: 'No Xero tenant found. Please configure a tenant_id in connection_config or metadata.'
        });
    }

    return firstConnection.tenantId;
}

const action = createAction({
    description: 'Create a purchase order for a contact.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.contacts', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const payload = {
            PurchaseOrders: [
                {
                    Contact: {
                        ContactID: input.contact.contact_id
                    },
                    Date: input.date,
                    LineItems: input.line_items.map((item) => ({
                        Description: item.description,
                        Quantity: item.quantity,
                        UnitAmount: item.unit_amount,
                        ...(item.account_code && { AccountCode: item.account_code }),
                        ...(item.tax_type && { TaxType: item.tax_type }),
                        ...(item.item_code && { ItemCode: item.item_code })
                    })),
                    ...(input.delivery_date && { DeliveryDate: input.delivery_date }),
                    ...(input.reference && { Reference: input.reference }),
                    ...(input.attention_to && { AttentionTo: input.attention_to }),
                    ...(input.telephone && { Telephone: input.telephone }),
                    ...(input.delivery_instructions && { DeliveryInstructions: input.delivery_instructions }),
                    ...(input.status && { Status: input.status })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.put({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: payload,
            retries: 3
        });

        const parsed = PurchaseOrderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API',
                details: parsed.error?.message || 'Unknown validation error'
            });
        }

        const purchaseOrder = parsed.data.PurchaseOrders[0];
        if (!purchaseOrder) {
            throw new nango.ActionError({
                type: 'no_purchase_order_returned',
                message: 'No purchase order was returned from the API'
            });
        }

        return {
            purchase_order_id: purchaseOrder.PurchaseOrderID,
            purchase_order_number: purchaseOrder.PurchaseOrderNumber || null,
            status: purchaseOrder.Status,
            contact_id: purchaseOrder.Contact.ContactID,
            contact_name: purchaseOrder.Contact.Name || null,
            date: purchaseOrder.Date,
            line_items: (purchaseOrder.LineItems || []).map((item) => ({
                description: item.Description,
                quantity: item.Quantity,
                unit_amount: item.UnitAmount,
                line_amount: item.LineAmount || null,
                account_code: item.AccountCode || null,
                tax_type: item.TaxType || null
            })),
            total: purchaseOrder.Total || null,
            sub_total: purchaseOrder.SubTotal || null,
            total_tax: purchaseOrder.TotalTax || null,
            updated_date_utc: purchaseOrder.UpdatedDateUTC || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
