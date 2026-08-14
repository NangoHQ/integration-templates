import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        page: z.number().optional().describe('Page number for pagination. Starts at 1. Omit for the first page.'),
        where: z.string().optional().describe('Xero WHERE filter clause to restrict the returned records. Example: Status=="AUTHORISED"'),
        if_modified_since: z
            .string()
            .optional()
            .describe('RFC 3339 / ISO 8601 timestamp for the If-Modified-Since header. Only records modified after this time will be returned.')
    })
    .describe('Input for listing Xero purchase orders with optional filters and pagination.');

const ContactSchema = z.object({
    ContactID: z.string().optional().describe('Unique identifier for the contact.'),
    Name: z.string().optional().describe('Name of the contact.')
});

const LineItemSchema = z.object({
    LineItemID: z.string().optional().describe('Unique identifier for the line item.'),
    Description: z.string().optional().describe('Description of the line item.'),
    Quantity: z.number().optional().describe('Quantity of the line item.'),
    UnitAmount: z.number().optional().describe('Unit price of the line item.'),
    LineAmount: z.number().optional().describe('Total amount for the line item.'),
    AccountCode: z.string().optional().describe('Account code for the line item.'),
    TaxType: z.string().optional().describe('Tax type applied to the line item.')
});

const PurchaseOrderSchema = z
    .object({
        PurchaseOrderID: z.string().optional().describe('Unique identifier for the purchase order.'),
        PurchaseOrderNumber: z.string().optional().describe('Purchase order number displayed to the user.'),
        Date: z.string().optional().describe('Date of the purchase order. Format: YYYY-MM-DD.'),
        DeliveryDate: z.string().optional().describe('Expected delivery date. Format: YYYY-MM-DD.'),
        Status: z.string().optional().describe('Status of the purchase order. Examples: DRAFT, SUBMITTED, AUTHORISED, BILLED, DELETED.'),
        Contact: ContactSchema.optional().describe('Contact associated with the purchase order.'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items on the purchase order.'),
        SubTotal: z.number().optional().describe('Subtotal of the purchase order excluding taxes.'),
        TotalTax: z.number().optional().describe('Total tax amount for the purchase order.'),
        Total: z.number().optional().describe('Total amount of the purchase order including taxes.'),
        UpdatedDateUTC: z.string().optional().describe('UTC timestamp of the last modification.'),
        HasAttachments: z.boolean().optional().describe('Whether the purchase order has file attachments.')
    })
    .passthrough();

const PaginationSchema = z
    .object({
        page: z.number().describe('Current page number.'),
        pageSize: z.number().describe('Number of records per page.'),
        pageCount: z.number().describe('Total number of pages available.'),
        itemCount: z.number().describe('Total number of records matching the query.')
    })
    .describe('Pagination metadata for the response.');

const OutputSchema = z
    .object({
        purchase_orders: z.array(PurchaseOrderSchema).describe('Array of purchase orders matching the query.'),
        pagination: PaginationSchema.describe('Pagination metadata for the response.'),
        next_page: z.number().optional().describe('Next page number if more pages are available. Omit if this is the last page.')
    })
    .describe('Output for listing Xero purchase orders.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of purchase orders from the Xero Accounting API.
 * @pitfalls: Date and UpdatedDateUTC are returned in Xero's /Date(timestamp+offset)/ format, not ISO 8601. The pagination object is present even when a where filter returns zero results. Unfiltered lists include soft-deleted purchase orders with Status DELETED.
 */
const action = createAction({
    description: 'List purchase orders with filters and pagination.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input) => {
        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input['if_modified_since'] !== undefined && input['if_modified_since'].length > 0) {
            headers['If-Modified-Since'] = input['if_modified_since'];
        }

        const params: Record<string, string> = {};
        if (input['page'] !== undefined) {
            params['page'] = String(input['page']);
        }
        if (input['where'] !== undefined && input['where'].length > 0) {
            params['where'] = input['where'];
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/PurchaseOrders',
            params,
            headers,
            retries: 3
        });

        const providerResponseSchema = z.object({
            PurchaseOrders: z.array(z.unknown()).optional(),
            pagination: z
                .object({
                    page: z.number(),
                    pageSize: z.number(),
                    pageCount: z.number(),
                    itemCount: z.number()
                })
                .optional()
        });

        const providerResponse = providerResponseSchema.parse(response.data);
        const purchaseOrdersRaw = providerResponse.PurchaseOrders ?? [];
        const pagination = providerResponse.pagination ?? { page: 1, pageSize: 100, pageCount: 1, itemCount: 0 };

        const purchaseOrders = purchaseOrdersRaw.map((item) => {
            return PurchaseOrderSchema.parse(item);
        });

        const nextPage = pagination.page < pagination.pageCount ? pagination.page + 1 : undefined;

        return {
            purchase_orders: purchaseOrders,
            pagination,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    if (connection.connection_config && typeof connection.connection_config === 'object') {
        const tenantId = connection.connection_config['tenant_id'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    if (connection.metadata && typeof connection.metadata === 'object') {
        const tenantId = connection.metadata['tenantId'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    const response = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/overview
        endpoint: 'connections',
        retries: 10
    });

    const rawConnections = response.data;
    if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (rawConnections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const first = z.object({ tenantId: z.string() }).safeParse(rawConnections[0]);
    if (first.success && first.data.tenantId.length > 0) {
        return first.data.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
