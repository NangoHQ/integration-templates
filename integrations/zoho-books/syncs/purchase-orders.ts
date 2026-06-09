import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PurchaseOrderSchema = z.object({
    id: z.string(),
    purchaseorder_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    delivery_date: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    total: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const CheckpointSchema = z.object({
    last_modified_time: z.string(),
    page: z.number()
});

const OrganizationResponseSchema = z.object({
    organizations: z
        .array(
            z.object({
                organization_id: z.string(),
                is_active: z.boolean().optional()
            })
        )
        .optional()
});

const PageContextSchema = z.object({
    page_context: z
        .object({
            has_more_page: z.boolean().optional()
        })
        .optional()
});

const RawPurchaseOrderSchema = z.object({
    purchaseorder_id: z.string(),
    purchaseorder_number: z.string().optional(),
    reference_number: z.string().optional().nullable(),
    date: z.string().optional(),
    delivery_date: z.string().optional().nullable(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    total: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync purchase orders from Zoho Books',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/purchase-orders',
            method: 'POST'
        }
    ],
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastModifiedTime =
            checkpoint && typeof checkpoint['last_modified_time'] === 'string' && checkpoint['last_modified_time'] !== ''
                ? checkpoint['last_modified_time']
                : undefined;
        let page: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;
        let maxLastModifiedTime: string | undefined;

        const rawMetadata: unknown = await nango.getMetadata();
        const parsedMetadata = z.object({ organization_id: z.string().optional() }).safeParse(rawMetadata);
        let organizationId = parsedMetadata.success ? parsedMetadata.data.organization_id : undefined;

        if (!organizationId) {
            // https://www.zoho.com/books/api/v3/organizations/#list-organizations
            const orgsResponse = await nango.get({
                endpoint: '/books/v3/organizations',
                retries: 3
            });

            const parsedOrgs = OrganizationResponseSchema.safeParse(orgsResponse.data);
            if (!parsedOrgs.success) {
                throw new Error('Failed to parse organizations response');
            }

            const activeOrg = parsedOrgs.data.organizations?.find((org) => org.is_active !== false);
            if (!activeOrg) {
                throw new Error('No active organization found');
            }

            organizationId = activeOrg.organization_id;
        }

        if (!organizationId) {
            throw new Error('organization_id is required');
        }

        const params: Record<string, string | number> = {
            organization_id: organizationId,
            sort_column: 'created_time'
        };
        if (lastModifiedTime) {
            params['last_modified_time'] = lastModifiedTime;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/purchase-order/#list-purchase-orders
            endpoint: '/books/v3/purchaseorders',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'purchaseorders',
                on_page: async ({ nextPageParam, response }) => {
                    const parsedPage = PageContextSchema.safeParse(response.data);
                    if (parsedPage.success && parsedPage.data.page_context?.has_more_page === false) {
                        page = undefined;
                    } else {
                        page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const purchaseOrders: Array<z.infer<typeof PurchaseOrderSchema>> = [];

            for (const rawRecord of pageResults) {
                const parsedRecord = RawPurchaseOrderSchema.safeParse(rawRecord);
                if (!parsedRecord.success) {
                    throw new Error('Failed to parse purchase order record');
                }

                const record = parsedRecord.data;
                const mapped: z.infer<typeof PurchaseOrderSchema> = {
                    id: record.purchaseorder_id,
                    ...(record.purchaseorder_number != null && { purchaseorder_number: record.purchaseorder_number }),
                    ...(record.reference_number != null && { reference_number: record.reference_number }),
                    ...(record.date != null && { date: record.date }),
                    ...(record.delivery_date != null && { delivery_date: record.delivery_date }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.vendor_id != null && { vendor_id: record.vendor_id }),
                    ...(record.vendor_name != null && { vendor_name: record.vendor_name }),
                    ...(record.currency_id != null && { currency_id: record.currency_id }),
                    ...(record.currency_code != null && { currency_code: record.currency_code }),
                    ...(record.total != null && { total: record.total }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time })
                };

                purchaseOrders.push(mapped);

                if (record.last_modified_time != null && (maxLastModifiedTime === undefined || record.last_modified_time > maxLastModifiedTime)) {
                    maxLastModifiedTime = record.last_modified_time;
                }
            }

            if (purchaseOrders.length === 0) {
                if (page === undefined && maxLastModifiedTime != null) {
                    await nango.saveCheckpoint({
                        last_modified_time: maxLastModifiedTime,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(purchaseOrders, 'PurchaseOrder');

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    last_modified_time: lastModifiedTime ?? maxLastModifiedTime ?? '',
                    page
                });
                continue;
            }

            await nango.saveCheckpoint({
                last_modified_time: maxLastModifiedTime ?? '',
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
