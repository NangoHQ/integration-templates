import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    purchaseOrderId: z.string().describe('Xero PurchaseOrderID. Example: "15369a9f-17b6-4235-83c4-0029256d1c37"')
});

const ContactSchema = z.object({}).passthrough();

const LineItemSchema = z.object({}).passthrough();

const ProviderPurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    TotalDiscount: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    Contact: ContactSchema.optional(),
    LineItems: z.array(LineItemSchema).optional(),
    HasAttachments: z.boolean().optional(),
    SentToContact: z.boolean().optional(),
    DeliveryAddress: z.string().optional(),
    AttentionTo: z.string().optional(),
    Telephone: z.string().optional(),
    DeliveryInstructions: z.string().optional(),
    BrandingThemeID: z.string().optional(),
    Type: z.string().optional()
});

const OutputSchema = ProviderPurchaseOrderSchema;

const action = createAction({
    description: 'Retrieve a purchase order by PurchaseOrderID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (
            connection &&
            typeof connection === 'object' &&
            'connection_config' in connection &&
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            'tenant_id' in connection.connection_config
        ) {
            const configValue = connection.connection_config['tenant_id'];
            if (typeof configValue === 'string') {
                tenantId = configValue;
            }
        }

        if (!tenantId) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.object({
                tenantId: z.string().optional()
            });
            const parsedMetadata = MetadataSchema.parse(metadata);
            tenantId = parsedMetadata.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants
            const connectionsResponse = await nango.get({
                endpoint: '/connections',
                baseUrlOverride: 'https://api.xero.com',
                headers: {
                    Accept: 'application/json'
                },
                retries: 10
            });

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string()
                })
            );
            const connections = ConnectionsSchema.parse(connectionsResponse.data);
            const firstConnection = connections[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connections.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve Xero tenant ID.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/purchaseorders
        const response = await nango.get({
            endpoint: `api.xro/2.0/PurchaseOrders/${input.purchaseOrderId}`,
            headers: {
                'xero-tenant-id': tenantId,
                Accept: 'application/json'
            },
            retries: 3
        });

        const BodySchema = z.object({
            PurchaseOrders: z.array(z.unknown())
        });
        const body = BodySchema.parse(response.data);

        const firstPurchaseOrder = body.PurchaseOrders[0];
        if (!firstPurchaseOrder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Purchase order with ID ${input.purchaseOrderId} not found.`
            });
        }

        const purchaseOrder = ProviderPurchaseOrderSchema.parse(firstPurchaseOrder);

        return purchaseOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
