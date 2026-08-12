import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        purchaseOrderId: z.string().describe('The Xero PurchaseOrderID to retrieve. Example: "b54db374-f478-4aaf-8778-6284df86e37f"')
    })
    .describe('Input for retrieving a Xero purchase order');

const LineItemSchema = z
    .object({
        LineItemID: z.string().optional().describe('Unique identifier for the line item'),
        Description: z.string().optional().describe('Description of the line item'),
        Quantity: z.number().optional().describe('Quantity ordered'),
        UnitAmount: z.number().optional().describe('Price per unit'),
        AccountCode: z.string().optional().describe('Account code for the line item')
    })
    .passthrough()
    .describe('A line item on a purchase order');

const ContactSchema = z
    .object({
        ContactID: z.string().describe('Unique identifier for the contact'),
        Name: z.string().optional().describe('Name of the contact')
    })
    .passthrough()
    .describe('Contact associated with a purchase order');

const ProviderPurchaseOrderSchema = z
    .object({
        PurchaseOrderID: z.string().describe('Unique identifier for the purchase order'),
        PurchaseOrderNumber: z.string().optional().describe('Purchase order number'),
        Status: z.string().describe('Current status of the purchase order, e.g., DRAFT, SUBMITTED, AUTHORISED, DELETED, VOIDED'),
        Contact: ContactSchema.optional().describe('Contact associated with the purchase order'),
        Date: z.string().optional().describe('Date of the purchase order (YYYY-MM-DD)'),
        DeliveryDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items on the purchase order'),
        UpdatedDateUTC: z.string().optional().describe('Last modified timestamp in UTC'),
        Total: z.number().optional().describe('Total amount of the purchase order'),
        CurrencyCode: z.string().optional().describe('Currency code, e.g., USD')
    })
    .passthrough()
    .describe('A Xero purchase order record');

const OutputSchema = ProviderPurchaseOrderSchema.describe('A Xero purchase order record');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single existing purchase order from Xero.
 * @pitfalls: Deleted and voided purchase orders remain retrievable with a Status of DELETED or VOIDED instead of a 404, and Date fields are returned in Microsoft /Date(...)/ JSON format rather than ISO 8601.
 */
const action = createAction({
    description: 'Retrieve a purchase order by PurchaseOrderID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (
            connection &&
            typeof connection === 'object' &&
            'connection_config' in connection &&
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId) {
            if (
                connection &&
                typeof connection === 'object' &&
                'metadata' in connection &&
                connection.metadata &&
                typeof connection.metadata === 'object' &&
                'tenantId' in connection.metadata &&
                typeof connection.metadata['tenantId'] === 'string' &&
                connection.metadata['tenantId'].length > 0
            ) {
                tenantId = connection.metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsSchema = z.array(
                z
                    .object({
                        tenantId: z.string()
                    })
                    .passthrough()
            );

            const parsedConnections = connectionsSchema.safeParse(connectionsResponse.data);
            const connectionsData = parsedConnections.success ? parsedConnections.data : [];

            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connectionsData[0];
            if (first && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: `api.xro/2.0/PurchaseOrders/${encodeURIComponent(input.purchaseOrderId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const purchaseOrdersResponseSchema = z.object({
            PurchaseOrders: z.array(ProviderPurchaseOrderSchema)
        });

        const parsed = purchaseOrdersResponseSchema.parse(response.data);

        const firstPo = parsed.PurchaseOrders[0];
        if (!firstPo) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Purchase order not found for ID: ${input.purchaseOrderId}`
            });
        }

        return firstPo;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
