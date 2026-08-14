import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z
        .string()
        .describe('Timestamp for the If-Modified-Since header to fetch only records changed since the last sync (empty string means no prior checkpoint)')
});

const LineItemSchema = z.object({
    LineItemID: z.string().optional().describe('Unique identifier for the line item in Xero'),
    Description: z.string().optional().describe('Description of the line item'),
    Quantity: z.number().optional().describe('Quantity of the line item'),
    UnitAmount: z.number().optional().describe('Unit price of the line item'),
    ItemCode: z.string().optional().describe('Item code for the line item'),
    AccountCode: z.string().optional().describe('Account code for the line item'),
    TaxType: z.string().optional().describe('Tax type for the line item'),
    LineAmount: z.number().optional().describe('Total line amount')
});

const ContactSchema = z.object({
    ContactID: z.string().describe('Unique identifier for the contact in Xero'),
    Name: z.string().optional().describe('Name of the contact')
});

const PurchaseOrderSchema = z
    .object({
        id: z.string().describe('Unique identifier for the purchase order'),
        PurchaseOrderID: z.string().describe('Unique identifier for the purchase order in Xero'),
        PurchaseOrderNumber: z.string().optional().describe('Purchase order number'),
        Date: z.string().optional().describe('Date the purchase order was issued'),
        DeliveryDate: z.string().optional().describe('Date the goods are expected to be delivered'),
        ExpectedArrivalDate: z.string().optional().describe('Expected arrival date of the goods'),
        Status: z.string().describe('Status of the purchase order'),
        LineAmountTypes: z.string().optional().describe('Line amount types'),
        SubTotal: z.number().optional().describe('Subtotal of the purchase order'),
        TotalTax: z.number().optional().describe('Total tax on the purchase order'),
        Total: z.number().optional().describe('Total amount of the purchase order'),
        UpdatedDateUTC: z.string().optional().describe('Last modified date in UTC'),
        CurrencyCode: z.string().optional().describe('Currency code'),
        CurrencyRate: z.number().optional().describe('Currency rate'),
        PurchaseOrderReference: z.string().optional().describe('Reference for the purchase order'),
        AttentionTo: z.string().optional().describe('Person attention should be directed to'),
        Telephone: z.string().optional().describe('Telephone number for contact'),
        DeliveryInstructions: z.string().optional().describe('Delivery instructions'),
        HasAttachments: z.boolean().optional().describe('Whether the purchase order has attachments'),
        Contact: ContactSchema.optional().describe('Contact associated with the purchase order'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items on the purchase order')
    })
    .describe('Purchase order from Xero');

const XeroPurchaseOrderSchema = z.object({
    PurchaseOrderID: z.string(),
    PurchaseOrderNumber: z.string().optional(),
    Date: z.string().optional(),
    DeliveryDate: z.string().optional(),
    ExpectedArrivalDate: z.string().optional(),
    Status: z.string(),
    LineAmountTypes: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    PurchaseOrderReference: z.string().optional(),
    AttentionTo: z.string().optional(),
    Telephone: z.string().optional(),
    DeliveryInstructions: z.string().optional(),
    HasAttachments: z.boolean().optional(),
    Contact: z
        .object({
            ContactID: z.string(),
            Name: z.string().optional()
        })
        .optional(),
    LineItems: z
        .array(
            z.object({
                LineItemID: z.string().optional(),
                Description: z.string().optional(),
                Quantity: z.number().optional(),
                UnitAmount: z.number().optional(),
                ItemCode: z.string().optional(),
                AccountCode: z.string().optional(),
                TaxType: z.string().optional(),
                LineAmount: z.number().optional()
            })
        )
        .optional()
});

function parseXeroDate(value: string): Date | null {
    // Allow negative timestamps for pre-1970 Xero dates (see general-ledger.ts parseDate).
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

const sync = createSync({
    description: 'Sync purchase orders from Xero',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? null : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint?.updated_after ?? '';

        const connection = await nango.getConnection();

        if (typeof connection !== 'object' || connection === null) {
            throw new Error('Invalid connection data');
        }

        const connection_config = 'connection_config' in connection ? connection['connection_config'] : undefined;
        const metadata = 'metadata' in connection ? connection['metadata'] : undefined;
        let tenantId: string | undefined;

        if (
            connection_config !== null &&
            connection_config !== undefined &&
            typeof connection_config === 'object' &&
            'tenant_id' in connection_config &&
            typeof connection_config['tenant_id'] === 'string' &&
            connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection_config['tenant_id'];
        } else if (
            metadata !== null &&
            metadata !== undefined &&
            typeof metadata === 'object' &&
            'tenantId' in metadata &&
            typeof metadata['tenantId'] === 'string' &&
            metadata['tenantId'].length > 0
        ) {
            tenantId = metadata['tenantId'];
        } else {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (!Array.isArray(connectionsResponse.data) || connectionsResponse.data.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }

            if (connectionsResponse.data.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const connectionsArraySchema = z.array(z.record(z.string(), z.unknown()));
            const connections = connectionsArraySchema.safeParse(connectionsResponse.data);

            if (connections.success) {
                const firstConnection = connections.data[0];

                if (
                    firstConnection &&
                    'tenantId' in firstConnection &&
                    typeof firstConnection['tenantId'] === 'string' &&
                    firstConnection['tenantId'].length > 0
                ) {
                    tenantId = firstConnection['tenantId'];
                }
            }
        }

        if (!tenantId) {
            throw new Error('Unable to resolve xero-tenant-id.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {};

        if (updatedAfter.length > 0) {
            headers['If-Modified-Since'] = updatedAfter;
            params['includeArchived'] = 'true';
        }

        let latestUpdatedDate: Date | null = updatedAfter.length > 0 ? parseXeroDate(updatedAfter) : null;
        let latestUpdatedAfter = updatedAfter;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/PurchaseOrders',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'PurchaseOrders',
                limit: 100,
                limit_name_in_request: 'pageSize'
            },
            retries: 3
        };

        for await (const records of nango.paginate(proxyConfig)) {
            const parsedRecords = z.array(XeroPurchaseOrderSchema).safeParse(records);

            if (!parsedRecords.success) {
                throw new Error('Failed to parse purchase order records');
            }

            const typedRecords = parsedRecords.data;

            if (typedRecords.length === 0) {
                continue;
            }

            const mapped = typedRecords.map((record) => ({
                id: record.PurchaseOrderID,
                PurchaseOrderID: record.PurchaseOrderID,
                ...(record.PurchaseOrderNumber !== undefined && { PurchaseOrderNumber: record.PurchaseOrderNumber }),
                ...(record.Date !== undefined && { Date: record.Date }),
                ...(record.DeliveryDate !== undefined && { DeliveryDate: record.DeliveryDate }),
                ...(record.ExpectedArrivalDate !== undefined && { ExpectedArrivalDate: record.ExpectedArrivalDate }),
                Status: record.Status,
                ...(record.LineAmountTypes !== undefined && { LineAmountTypes: record.LineAmountTypes }),
                ...(record.SubTotal !== undefined && { SubTotal: record.SubTotal }),
                ...(record.TotalTax !== undefined && { TotalTax: record.TotalTax }),
                ...(record.Total !== undefined && { Total: record.Total }),
                ...(record.UpdatedDateUTC !== undefined && { UpdatedDateUTC: record.UpdatedDateUTC }),
                ...(record.CurrencyCode !== undefined && { CurrencyCode: record.CurrencyCode }),
                ...(record.CurrencyRate !== undefined && { CurrencyRate: record.CurrencyRate }),
                ...(record.PurchaseOrderReference !== undefined && { PurchaseOrderReference: record.PurchaseOrderReference }),
                ...(record.AttentionTo !== undefined && { AttentionTo: record.AttentionTo }),
                ...(record.Telephone !== undefined && { Telephone: record.Telephone }),
                ...(record.DeliveryInstructions !== undefined && { DeliveryInstructions: record.DeliveryInstructions }),
                ...(record.HasAttachments !== undefined && { HasAttachments: record.HasAttachments }),
                ...(record.Contact !== undefined && { Contact: record.Contact }),
                ...(record.LineItems !== undefined && { LineItems: record.LineItems })
            }));

            const activeRecords = mapped.filter((r) => r.Status !== 'DELETED' && r.Status !== 'VOIDED');
            const deletedRecords = mapped.filter((r) => r.Status === 'DELETED' || r.Status === 'VOIDED');

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'PurchaseOrder');
            }

            if (updatedAfter.length > 0 && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'PurchaseOrder');
            }

            for (const record of mapped) {
                if (!record.UpdatedDateUTC) {
                    continue;
                }
                const parsedDate = parseXeroDate(record.UpdatedDateUTC);
                if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedDate;
                    latestUpdatedAfter = formatIfModifiedSince(parsedDate);
                }
            }

            if (latestUpdatedAfter.length > 0) {
                await nango.saveCheckpoint({
                    updated_after: latestUpdatedAfter
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
