import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z
        .object({
            CurrentDivision: z.number().optional(),
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.number().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const SalesOrderSchema = z.object({
    OrderID: z.string().optional(),
    OrderNumber: z.number().optional(),
    OrderedBy: z.string().optional(),
    AmountDC: z.number().optional(),
    Status: z.number().optional(),
    Modified: z.string().optional()
});

const RecordSchema = z.object({
    id: z.string(),
    OrderNumber: z.number().optional(),
    OrderedBy: z.string().optional(),
    AmountDC: z.number().optional(),
    Status: z.number().optional(),
    Modified: z.string().optional()
});

type OrderRecord = {
    id: string;
    OrderNumber?: number | undefined;
    OrderedBy?: string | undefined;
    AmountDC?: number | undefined;
    Status?: number | undefined;
    Modified?: string | undefined;
};

const sync = createSync({
    description: 'Sync sales orders with incremental updates',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-SCR-sandbox-salesorder-SalesOrders
    // @ts-expect-error Nango SDK type definition mismatch; runtime accepts endpoint
    endpoint: {
        path: '/syncs/sales-orders',
        method: 'GET'
    },
    models: {
        SalesOrder: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-SCR-getdivision
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.safeParse(meResponse.data);
        if (!meData.success) {
            throw new Error(`Failed to parse Me response: ${JSON.stringify(meData.error.issues)}`);
        }

        const currentDivision = meData.data.d?.CurrentDivision ?? meData.data.d?.results?.[0]?.CurrentDivision;
        if (currentDivision === undefined) {
            throw new Error('CurrentDivision not found in Me response');
        }

        const division = String(currentDivision);

        const proxyConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-SCR-sandbox-salesorder-SalesOrders
            endpoint: `/api/v1/${encodeURIComponent(division)}/salesorder/SalesOrders`,
            params: {
                $orderby: 'Modified asc',
                ...(updatedAfter && { $filter: `Modified gt datetime'${updatedAfter}'` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'per-page',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const orders: OrderRecord[] = [];
            for (const raw of page) {
                const parsed = SalesOrderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse sales order: ${JSON.stringify(parsed.error.issues)}`);
                }

                const record = parsed.data;
                if (typeof record.OrderID !== 'string' || record.OrderID.length === 0) {
                    throw new Error('SalesOrder missing OrderID');
                }

                orders.push({
                    id: record.OrderID,
                    OrderNumber: record.OrderNumber,
                    OrderedBy: record.OrderedBy,
                    AmountDC: record.AmountDC,
                    Status: record.Status,
                    Modified: record.Modified
                });
            }

            if (orders.length > 0) {
                await nango.batchSave(orders, 'SalesOrder');

                const lastRecord = orders[orders.length - 1];
                if (lastRecord) {
                    const lastModified = lastRecord.Modified;
                    if (typeof lastModified === 'string') {
                        await nango.saveCheckpoint({ updated_after: lastModified });
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
