import { createSync } from 'nango';
import { z } from 'zod';

const ProviderWarehouseSchema = z
    .object({
        dataAreaId: z.string(),
        WarehouseId: z.string(),
        WarehouseName: z.string().nullable().optional(),
        SiteId: z.string().nullable().optional()
    })
    .passthrough();

const WarehouseSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    warehouseId: z.string(),
    warehouseName: z.string().optional(),
    siteId: z.string().optional()
});

const sync = createSync({
    description: 'Sync warehouses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Warehouse: WarehouseSchema
    },

    exec: async (nango) => {
        // The Warehouses dataset is a tiny reference snapshot in the validated tenant,
        // so a plain full refresh is simpler than persisting resume state.

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        // Fetch and validate the first page before starting delete tracking, so a failed/invalid
        // first response doesn't leave delete-tracking open with zero records enumerated.
        const iterator = nango
            .paginate({
                endpoint: '/data/Warehouses',
                params: {
                    'cross-company': 'true',
                    $orderby: 'dataAreaId asc,WarehouseId asc'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: '$skip',
                    offset_start_value: 0,
                    offset_calculation_method: 'by-response-size',
                    limit_name_in_request: '$top',
                    limit: 100,
                    response_path: 'value'
                },
                retries: 3
            })
            [Symbol.asyncIterator]();
        let result = await iterator.next();
        let trackingStarted = false;

        while (!result.done) {
            const page = result.value;
            const warehouses = [];

            for (const record of page) {
                const parsed = ProviderWarehouseSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse warehouse record: ${parsed.error.message}`);
                }

                const data = parsed.data;
                warehouses.push({
                    id: `${data.dataAreaId}-${data.WarehouseId}`,
                    dataAreaId: data.dataAreaId,
                    warehouseId: data.WarehouseId,
                    ...(data.WarehouseName != null && { warehouseName: data.WarehouseName }),
                    ...(data.SiteId != null && { siteId: data.SiteId })
                });
            }

            if (!trackingStarted) {
                await nango.trackDeletesStart('Warehouse');
                trackingStarted = true;
            }

            if (warehouses.length > 0) {
                await nango.batchSave(warehouses, 'Warehouse');
            }

            result = await iterator.next();
        }

        if (trackingStarted) {
            await nango.trackDeletesEnd('Warehouse');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
