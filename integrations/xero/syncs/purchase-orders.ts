import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const PurchaseOrderSchema = z.object({
    id: z.string(),
    purchase_order_number: z.string().optional(),
    date: z.string().optional(),
    delivery_date: z.string().optional(),
    expected_arrival_date: z.string().optional(),
    status: z.string(),
    reference: z.string().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional(),
    updated_date_utc: z.string(),
    currency_code: z.string().optional(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional()
});

const ConnectionResponseSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const TenantSchema = z.object({
    tenantId: z.string()
});

const PurchaseOrdersResponseSchema = z.object({
    PurchaseOrders: z.array(z.record(z.string(), z.unknown())).optional()
});

function parseXeroDate(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
        return '';
    }
    const msMatch = value.match(/^\/Date\((\d+)([+-]\d{4})\)\/$/);
    if (msMatch && msMatch[1] !== undefined) {
        const timestamp = parseInt(msMatch[1], 10);
        return new Date(timestamp).toISOString();
    }
    if (!Number.isNaN(Date.parse(value))) {
        return value;
    }
    return '';
}

const sync = createSync({
    description: 'Sync purchase orders from Xero.',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/purchase-orders' }],
    frequency: 'every hour',
    autoStart: true,
    scopes: ['accounting.invoices.read'],
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = validatedCheckpoint.success ? validatedCheckpoint.data.updated_after : '';

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string> = {};

        if (updatedAfter.length > 0) {
            headers['If-Modified-Since'] = updatedAfter;
            params['includeArchived'] = 'true';
        }

        let page = 1;
        let hasMorePages = true;
        let latestUpdatedDate = updatedAfter;

        while (hasMorePages) {
            // https://developer.xero.com/documentation/api/accounting/purchaseorders
            const response = await nango.get({
                endpoint: 'api.xro/2.0/PurchaseOrders',
                headers,
                params: {
                    ...params,
                    page: String(page)
                },
                retries: 3
            });

            const parsed = PurchaseOrdersResponseSchema.safeParse(response.data);
            const purchaseOrders = parsed.success ? (parsed.data.PurchaseOrders ?? []) : [];
            if (purchaseOrders.length === 0) {
                hasMorePages = false;
                break;
            }

            const activeOrders: Array<z.infer<typeof PurchaseOrderSchema>> = [];
            const deletedOrders: Array<{ id: string }> = [];

            for (const raw of purchaseOrders) {
                const orderParsed = z
                    .object({
                        PurchaseOrderID: z.string(),
                        PurchaseOrderNumber: z.string().optional(),
                        Date: z.string().optional(),
                        DeliveryDate: z.string().optional(),
                        ExpectedArrivalDate: z.string().optional(),
                        Status: z.string(),
                        Reference: z.string().optional(),
                        SubTotal: z.number().optional(),
                        TotalTax: z.number().optional(),
                        Total: z.number().optional(),
                        UpdatedDateUTC: z.string(),
                        CurrencyCode: z.string().optional(),
                        Contact: z
                            .object({
                                ContactID: z.string().optional(),
                                Name: z.string().optional()
                            })
                            .optional()
                    })
                    .safeParse(raw);

                if (!orderParsed.success) {
                    continue;
                }

                const order = orderParsed.data;
                const mapped: z.infer<typeof PurchaseOrderSchema> = {
                    id: order.PurchaseOrderID,
                    ...(order.PurchaseOrderNumber !== undefined && { purchase_order_number: order.PurchaseOrderNumber }),
                    ...(order.Date !== undefined && { date: parseXeroDate(order.Date) }),
                    ...(order.DeliveryDate !== undefined && { delivery_date: parseXeroDate(order.DeliveryDate) }),
                    ...(order.ExpectedArrivalDate !== undefined && { expected_arrival_date: parseXeroDate(order.ExpectedArrivalDate) }),
                    status: order.Status,
                    ...(order.Reference !== undefined && { reference: order.Reference }),
                    ...(order.SubTotal !== undefined && { sub_total: order.SubTotal }),
                    ...(order.TotalTax !== undefined && { total_tax: order.TotalTax }),
                    ...(order.Total !== undefined && { total: order.Total }),
                    updated_date_utc: parseXeroDate(order.UpdatedDateUTC),
                    ...(order.CurrencyCode !== undefined && { currency_code: order.CurrencyCode }),
                    ...(order.Contact?.ContactID !== undefined && { contact_id: order.Contact.ContactID }),
                    ...(order.Contact?.Name !== undefined && { contact_name: order.Contact.Name })
                };

                if (order.Status === 'DELETED') {
                    deletedOrders.push({ id: mapped.id });
                } else {
                    activeOrders.push(mapped);
                }

                const updatedDateIso = parseXeroDate(order.UpdatedDateUTC);
                if (updatedDateIso.length > 0 && updatedDateIso > latestUpdatedDate) {
                    latestUpdatedDate = updatedDateIso;
                }
            }

            if (activeOrders.length > 0) {
                await nango.batchSave(activeOrders, 'PurchaseOrder');
            }

            if (deletedOrders.length > 0 && checkpoint !== null) {
                await nango.batchDelete(deletedOrders, 'PurchaseOrder');
            }

            page = page + 1;
        }

        if (latestUpdatedDate.length > 0) {
            await nango.saveCheckpoint({ updated_after: latestUpdatedDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function resolveTenantId(nango: NangoSyncLocal): Promise<string> {
    const connectionResponse = await nango.getConnection();
    const connectionParsed = ConnectionResponseSchema.safeParse(connectionResponse);
    if (connectionParsed.success) {
        const configTenantId = connectionParsed.data.connection_config?.['tenant_id'];
        if (typeof configTenantId === 'string') {
            return configTenantId;
        }
        const metadataTenantId = connectionParsed.data.metadata?.['tenantId'];
        if (typeof metadataTenantId === 'string') {
            return metadataTenantId;
        }
    }

    // https://developer.xero.com/documentation/guides/oauth2/tenants
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        baseUrlOverride: 'https://api.xero.com',
        retries: 10
    });

    const tenantsParsed = z.array(TenantSchema).safeParse(connectionsResponse.data);
    if (!tenantsParsed.success || tenantsParsed.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }
    if (tenantsParsed.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstTenant = tenantsParsed.data[0];
    if (!firstTenant) {
        throw new Error('No Xero tenants found for this connection.');
    }

    return firstTenant.tenantId;
}
