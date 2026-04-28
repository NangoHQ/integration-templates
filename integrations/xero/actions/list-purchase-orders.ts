import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Page: z.number().optional().describe('Page number for pagination. Starts at 1.'),
    Where: z.string().optional().describe('Xero WHERE clause for filtering. Example: Status == "AUTHORISED"'),
    IfModifiedSince: z.string().optional().describe('ISO 8601 timestamp to return only records modified after this date.')
});

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional()
});

const ProviderPurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string(),
    Contact: ProviderContactSchema.optional(),
    LineItems: z.array(ProviderLineItemSchema).optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    Total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    PurchaseOrders: z.array(ProviderPurchaseOrderSchema).optional()
});

const PurchaseOrderOutputSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string(),
    ContactID: z.string().optional(),
    ContactName: z.string().optional(),
    LineItems: z
        .array(
            z.object({
                LineItemID: z.string().optional(),
                Description: z.string().optional(),
                Quantity: z.number().optional(),
                UnitAmount: z.number().optional()
            })
        )
        .optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    Total: z.number().optional()
});

const OutputSchema = z.object({
    PurchaseOrders: z.array(PurchaseOrderOutputSchema),
    NextPage: z.number().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ConnectionsResponseSchema = z.object({
    data: z
        .array(
            z.object({
                tenantId: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'List purchase orders with filters and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-purchase-orders',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = ConnectionsResponseSchema.parse(connectionsResponse.data);
            if (!connections.data || connections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            if (connections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections.data[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve xero-tenant-id.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.IfModifiedSince) {
            headers['If-Modified-Since'] = input.IfModifiedSince;
        }

        const params: Record<string, string | number> = {};
        if (input.Page !== undefined) {
            params['page'] = String(input.Page);
        }
        if (input.Where) {
            params['where'] = input.Where;
        }

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.get({
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers: headers,
            params: params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const purchaseOrders = (providerData.PurchaseOrders || []).map((po) => {
            return {
                PurchaseOrderID: po.PurchaseOrderID,
                ...(po.PurchaseOrderNumber !== undefined && { PurchaseOrderNumber: po.PurchaseOrderNumber }),
                ...(po.Date !== undefined && { Date: po.Date }),
                ...(po.DeliveryDate !== undefined && { DeliveryDate: po.DeliveryDate }),
                ...(po.ExpectedArrivalDate !== undefined && { ExpectedArrivalDate: po.ExpectedArrivalDate }),
                ...(po.Reference !== undefined && { Reference: po.Reference }),
                Status: po.Status,
                ...(po.Contact !== undefined && po.Contact.ContactID !== undefined && { ContactID: po.Contact.ContactID }),
                ...(po.Contact !== undefined && po.Contact.Name !== undefined && { ContactName: po.Contact.Name }),
                ...(po.LineItems !== undefined && {
                    LineItems: po.LineItems.map((li) => {
                        return {
                            ...(li.LineItemID !== undefined && { LineItemID: li.LineItemID }),
                            ...(li.Description !== undefined && { Description: li.Description }),
                            ...(li.Quantity !== undefined && { Quantity: li.Quantity }),
                            ...(li.UnitAmount !== undefined && { UnitAmount: li.UnitAmount })
                        };
                    })
                }),
                ...(po.UpdatedDateUTC !== undefined && { UpdatedDateUTC: po.UpdatedDateUTC }),
                ...(po.CurrencyCode !== undefined && { CurrencyCode: po.CurrencyCode }),
                ...(po.Total !== undefined && { Total: po.Total })
            };
        });

        const currentPage = input.Page ?? 1;
        const nextPage = purchaseOrders.length > 0 ? currentPage + 1 : undefined;

        return {
            PurchaseOrders: purchaseOrders,
            ...(nextPage !== undefined && { NextPage: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
