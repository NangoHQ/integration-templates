import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://www.zoho.com/crm/developer/docs/api/v2/products-response.html
const ProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().optional(),
    Product_Code: z.string().nullable().optional(),
    Product_Category: z.string().nullable().optional(),
    Unit_Price: z.number().nullable().optional(),
    Taxable: z.boolean().optional(),
    Description: z.string().nullable().optional(),
    Manufacturer: z.string().nullable().optional(),
    Usage_Unit: z.string().nullable().optional(),
    Qty_in_Stock: z.number().nullable().optional(),
    Qty_Ordered: z.number().nullable().optional(),
    Qty_in_Demand: z.number().nullable().optional(),
    Reorder_Level: z.number().nullable().optional(),
    Commission_Rate: z.number().nullable().optional(),
    Sales_Start_Date: z.string().nullable().optional(),
    Sales_End_Date: z.string().nullable().optional(),
    Support_Start_Date: z.string().nullable().optional(),
    Support_Expiry_Date: z.string().nullable().optional(),
    Handler: z
        .object({ name: z.string().nullable().optional(), id: z.string().nullable().optional(), email: z.string().nullable().optional() })
        .nullable()
        .optional(),
    Owner: z.object({ name: z.string().nullable().optional(), id: z.string().nullable().optional(), email: z.string().nullable().optional() }).optional(),
    Created_By: z.object({ name: z.string().nullable().optional(), id: z.string().nullable().optional(), email: z.string().nullable().optional() }).optional(),
    Modified_By: z.object({ name: z.string().nullable().optional(), id: z.string().nullable().optional(), email: z.string().nullable().optional() }).optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    $approved: z.boolean().optional(),
    $editable: z.boolean().optional()
});

// Checkpoint values must be string, number, or boolean (not optional)
const CheckpointSchema = z.object({
    modified_after: z.string()
});

const sync = createSync({
    description: 'Sync products from Zoho CRM.',
    version: '1.0.0',
    frequency: 'every hour',
    endpoints: [{ method: 'GET', path: '/syncs/products' }],
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const previousModifiedAfter = checkpoint?.modified_after || undefined;

        // Build headers with optional If-Modified-Since
        const headers: Record<string, string> = {};
        if (checkpoint?.modified_after) {
            headers['If-Modified-Since'] = checkpoint.modified_after;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Products',
            ...(Object.keys(headers).length > 0 && { headers }),
            params: {
                sort_by: 'Modified_Time',
                sort_order: 'asc',
                per_page: '200'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        let maxModifiedTime: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const products = page.map(
                (record: {
                    id: string;
                    Product_Name?: string | null;
                    Product_Code?: string | null;
                    Product_Category?: string | null;
                    Unit_Price?: number | null;
                    Taxable?: boolean;
                    Description?: string | null;
                    Manufacturer?: string | null;
                    Usage_Unit?: string | null;
                    Qty_in_Stock?: number | null;
                    Qty_Ordered?: number | null;
                    Qty_in_Demand?: number | null;
                    Reorder_Level?: number | null;
                    Commission_Rate?: number | null;
                    Sales_Start_Date?: string | null;
                    Sales_End_Date?: string | null;
                    Support_Start_Date?: string | null;
                    Support_Expiry_Date?: string | null;
                    Handler?: { name?: string | null; id?: string | null; email?: string | null } | null;
                    Owner?: { name?: string | null; id?: string | null; email?: string | null };
                    Created_By?: { name?: string | null; id?: string | null; email?: string | null };
                    Modified_By?: { name?: string | null; id?: string | null; email?: string | null };
                    Created_Time?: string;
                    Modified_Time?: string;
                    $approved?: boolean;
                    $editable?: boolean;
                }) => ({
                    id: record.id,
                    Product_Name: record.Product_Name,
                    Product_Code: record.Product_Code,
                    Product_Category: record.Product_Category,
                    Unit_Price: record.Unit_Price,
                    Taxable: record.Taxable,
                    Description: record.Description,
                    Manufacturer: record.Manufacturer,
                    Usage_Unit: record.Usage_Unit,
                    Qty_in_Stock: record.Qty_in_Stock,
                    Qty_Ordered: record.Qty_Ordered,
                    Qty_in_Demand: record.Qty_in_Demand,
                    Reorder_Level: record.Reorder_Level,
                    Commission_Rate: record.Commission_Rate,
                    Sales_Start_Date: record.Sales_Start_Date,
                    Sales_End_Date: record.Sales_End_Date,
                    Support_Start_Date: record.Support_Start_Date,
                    Support_Expiry_Date: record.Support_Expiry_Date,
                    Handler: record.Handler,
                    Owner: record.Owner,
                    Created_By: record.Created_By,
                    Modified_By: record.Modified_By,
                    Created_Time: record.Created_Time,
                    Modified_Time: record.Modified_Time,
                    $approved: record.$approved,
                    $editable: record.$editable
                })
            );

            if (products.length === 0) {
                continue;
            }

            await nango.batchSave(products, 'Product');

            const lastProduct = products[products.length - 1];
            if (lastProduct && lastProduct.Modified_Time) {
                maxModifiedTime = lastProduct.Modified_Time;
            }
        }

        if (maxModifiedTime) {
            await nango.saveCheckpoint({ modified_after: maxModifiedTime });
        }

        // Fetch and process deleted records only if we have a checkpoint
        // On first run (no checkpoint), we skip deletion handling
        // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
        if (previousModifiedAfter) {
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Products/deleted',
                headers: {
                    'If-Modified-Since': previousModifiedAfter
                },
                params: {
                    type: 'all',
                    per_page: '200'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            const deletedRecords: Array<{ id: string }> = [];
            for await (const page of nango.paginate<{ id: string }>(deletedProxyConfig)) {
                for (const record of page) {
                    deletedRecords.push({ id: record.id });
                }
            }

            if (deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'Product');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
