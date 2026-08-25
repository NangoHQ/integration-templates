import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WarehouseSchema = z.object({
    id: z.string(),
    warehouse_id: z.string(),
    warehouse_name: z.string().optional(),
    data_area_id: z.string(),
    site_id: z.string().optional()
});

const RawWarehouseSchema = z
    .object({
        dataAreaId: z.string(),
        WarehouseId: z.string(),
        WarehouseName: z.string().optional().nullable(),
        OperationalSiteId: z.string().optional().nullable()
    })
    .passthrough();

const CheckpointSchema = z.object({
    $skip: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync warehouses.',
    version: '1.0.2',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Warehouse: WarehouseSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextSkip = checkpoint?.['$skip'] ?? 0;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Warehouse');

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Warehouses',
            params: {
                'cross-company': 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: nextSkip,
                offset_calculation_method: 'per-page',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        nextSkip = nextPageParam;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);
            const warehouses = rawItems.map((raw) => {
                const record = RawWarehouseSchema.parse(raw);

                return {
                    id: `${record.dataAreaId}-${record.WarehouseId}`,
                    warehouse_id: record.WarehouseId,
                    warehouse_name: record.WarehouseName ?? undefined,
                    data_area_id: record.dataAreaId,
                    site_id: record.OperationalSiteId ?? undefined
                };
            });

            if (warehouses.length > 0) {
                await nango.batchSave(warehouses, 'Warehouse');
            }

            await nango.saveCheckpoint({ $skip: nextSkip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Warehouse');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
