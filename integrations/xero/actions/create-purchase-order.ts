import { z } from 'zod';
import { createAction } from 'nango';

// https://developer.xero.com/documentation/api/accounting/purchaseorders
const ContactSchema = z.object({
    contactId: z.string().describe('Xero Contact ID. Example: "a3d8b6c0-1234-5678-9abc-def012345678"')
});

const LineItemSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office Supplies"'),
    quantity: z.number().describe('Quantity of items. Example: 5'),
    unitAmount: z.number().describe('Price per unit. Example: 25.5'),
    accountCode: z.string().optional().describe('Account code for this line item. Example: "200"'),
    taxType: z.string().optional().describe('Tax type for this line item. Example: "NONE"'),
    itemCode: z.string().optional().describe('Item code if referencing an existing item. Example: "ITM001"')
});

const InputSchema = z.object({
    contact: ContactSchema.describe('Contact information for the purchase order'),
    date: z.string().describe('Purchase order date in YYYY-MM-DD format. Example: "2025-01-15"'),
    lineItems: z.array(LineItemSchema).min(1).describe('Line items for the purchase order'),
    deliveryDate: z.string().optional().describe('Expected delivery date in YYYY-MM-DD format. Example: "2025-02-01"'),
    reference: z.string().optional().describe('Reference for the purchase order. Example: "PO-001"'),
    attentionTo: z.string().optional().describe('Person to address the purchase order to. Example: "John Smith"'),
    telephone: z.string().optional().describe('Contact phone number. Example: "+61 2 9876 5432"'),
    deliveryInstructions: z.string().optional().describe('Delivery instructions. Example: "Deliver to rear entrance"'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED', 'DELETED']).optional().describe('Purchase order status. Example: "DRAFT"')
});

const OutputSchema = z.object({
    purchaseOrderId: z.string().describe('Xero Purchase Order ID'),
    purchaseOrderNumber: z.union([z.string(), z.null()]).describe('Xero Purchase Order Number'),
    status: z.string().describe('Purchase order status'),
    contactId: z.string().describe('Contact ID associated with the purchase order'),
    contactName: z.union([z.string(), z.null()]).describe('Contact name'),
    date: z.string().describe('Purchase order date'),
    lineItems: z
        .array(
            z.object({
                description: z.string(),
                quantity: z.number(),
                unitAmount: z.number(),
                lineAmount: z.union([z.number(), z.null()]),
                accountCode: z.union([z.string(), z.null()]),
                taxType: z.union([z.string(), z.null()])
            })
        )
        .describe('Line items'),
    total: z.union([z.number(), z.null()]).describe('Total amount'),
    subTotal: z.union([z.number(), z.null()]).describe('Subtotal amount'),
    totalTax: z.union([z.number(), z.null()]).describe('Total tax amount'),
    updatedDateUtc: z.union([z.string(), z.null()]).describe('Last updated timestamp')
});

const ConnectionsResponseSchema = z.array(
    z.object({
        id: z.string(),
        tenantId: z.string(),
        tenantName: z.string().optional()
    })
);

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
    if (!parsed.success || parsed.data.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant_found',
            message: 'No Xero tenant found. Please configure a tenant_id in connection_config or metadata.'
        });
    }

    if (parsed.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = parsed.data[0];
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
                        ContactID: input.contact.contactId
                    },
                    Date: input.date,
                    LineItems: input.lineItems.map((item) => ({
                        Description: item.description,
                        Quantity: item.quantity,
                        UnitAmount: item.unitAmount,
                        ...(item.accountCode && { AccountCode: item.accountCode }),
                        ...(item.taxType && { TaxType: item.taxType }),
                        ...(item.itemCode && { ItemCode: item.itemCode })
                    })),
                    ...(input.deliveryDate && { DeliveryDate: input.deliveryDate }),
                    ...(input.reference && { Reference: input.reference }),
                    ...(input.attentionTo && { AttentionTo: input.attentionTo }),
                    ...(input.telephone && { Telephone: input.telephone }),
                    ...(input.deliveryInstructions && { DeliveryInstructions: input.deliveryInstructions }),
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
            purchaseOrderId: purchaseOrder.PurchaseOrderID,
            purchaseOrderNumber: purchaseOrder.PurchaseOrderNumber || null,
            status: purchaseOrder.Status,
            contactId: purchaseOrder.Contact.ContactID,
            contactName: purchaseOrder.Contact.Name || null,
            date: purchaseOrder.Date,
            lineItems: (purchaseOrder.LineItems || []).map((item) => ({
                description: item.Description,
                quantity: item.Quantity,
                unitAmount: item.UnitAmount,
                lineAmount: item.LineAmount || null,
                accountCode: item.AccountCode || null,
                taxType: item.TaxType || null
            })),
            total: purchaseOrder.Total || null,
            subTotal: purchaseOrder.SubTotal || null,
            totalTax: purchaseOrder.TotalTax || null,
            updatedDateUtc: purchaseOrder.UpdatedDateUTC || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
