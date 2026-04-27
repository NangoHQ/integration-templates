import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().describe('Quantity of the item. Example: 2'),
    unit_amount: z.number().describe('Unit price of the item. Example: 50.00'),
    account_code: z.string().optional().describe('Account code for the line item. Example: "200"'),
    tax_type: z.string().optional().describe('Tax type for the line item. Example: "NONE"')
});

const InputSchema = z.object({
    contact_id: z.string().describe('Contact ID for the purchase order. Example: "00000000-0000-0000-0000-000000000000"'),
    date: z.string().optional().describe('Purchase order date in YYYY-MM-DD format. Defaults to today if omitted.'),
    line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the purchase order.')
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const LineItemSchema = z
    .object({
        Description: z.string().optional(),
        Quantity: z.number().optional(),
        UnitAmount: z.number().optional(),
        AccountCode: z.string().optional(),
        TaxType: z.string().optional(),
        LineAmount: z.number().optional()
    })
    .passthrough();

const PurchaseOrderSchema = z
    .object({
        PurchaseOrderID: z.string().optional(),
        PurchaseOrderNumber: z.string().optional(),
        Date: z.string().optional(),
        Contact: ContactSchema.optional(),
        LineItems: z.array(LineItemSchema).optional(),
        Status: z.string().optional(),
        Total: z.number().optional(),
        UpdatedDateUTC: z.string().optional()
    })
    .passthrough();

const PurchaseOrdersResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    PurchaseOrders: z.array(PurchaseOrderSchema).optional()
});

const OutputSchema = z.object({
    purchase_order_id: z.string().optional(),
    purchase_order_number: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    total: z.number().optional(),
    line_items: z
        .array(
            z.object({
                description: z.string().optional(),
                quantity: z.number().optional(),
                unit_amount: z.number().optional(),
                account_code: z.string().optional(),
                tax_type: z.string().optional(),
                line_amount: z.number().optional()
            })
        )
        .optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
    ActionError: new (payload: Record<string, unknown>) => Error;
}): Promise<string> {
    const connection = await nango.getConnection();

    const conn = ConnectionSchema.safeParse(connection);
    if (conn.success) {
        const config = conn.data.connection_config;
        if (config && typeof config['tenant_id'] === 'string' && config['tenant_id'].length > 0) {
            return config['tenant_id'];
        }
        const meta = conn.data.metadata;
        if (meta && typeof meta['tenantId'] === 'string' && meta['tenantId'].length > 0) {
            return meta['tenantId'];
        }
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connectionsData = z.array(z.unknown()).parse(response.data);
    if (connectionsData.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }
    if (connectionsData.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = z.object({ tenantId: z.string() }).parse(connectionsData[0]);
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
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const lineItems = input.line_items.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unit_amount,
            ...(item.account_code !== undefined && { AccountCode: item.account_code }),
            ...(item.tax_type !== undefined && { TaxType: item.tax_type })
        }));

        const requestBody = {
            PurchaseOrders: [
                {
                    Contact: {
                        ContactID: input.contact_id
                    },
                    Date: input.date || new Date().toISOString().split('T')[0],
                    LineItems: lineItems
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.put({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: requestBody,
            retries: 3
        });

        const parsed = PurchaseOrdersResponseSchema.parse(response.data);
        const purchaseOrders = parsed.PurchaseOrders;
        if (!purchaseOrders || purchaseOrders.length === 0) {
            throw new nango.ActionError({
                type: 'no_purchase_order',
                message: 'No purchase order returned from Xero.'
            });
        }

        const po = purchaseOrders[0];
        if (!po) {
            throw new nango.ActionError({
                type: 'no_purchase_order',
                message: 'No purchase order returned from Xero.'
            });
        }

        return {
            ...(po.PurchaseOrderID !== undefined && { purchase_order_id: po.PurchaseOrderID }),
            ...(po.PurchaseOrderNumber !== undefined && { purchase_order_number: po.PurchaseOrderNumber }),
            ...(po.Status !== undefined && { status: po.Status }),
            ...(po.Date !== undefined && { date: po.Date }),
            ...(po.Contact?.ContactID !== undefined && { contact_id: po.Contact.ContactID }),
            ...(po.Contact?.Name !== undefined && { contact_name: po.Contact.Name }),
            ...(po.Total !== undefined && { total: po.Total }),
            ...(po.LineItems !== undefined && {
                line_items: po.LineItems.map((item) => ({
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unit_amount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { account_code: item.AccountCode }),
                    ...(item.TaxType !== undefined && { tax_type: item.TaxType }),
                    ...(item.LineAmount !== undefined && { line_amount: item.LineAmount })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
