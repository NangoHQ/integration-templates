import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ODataEnvelopeSchema = z.object({
    value: z.array(z.unknown())
});

const ProviderPurchaseOrderLineSchema = z
    .object({
        dataAreaId: z.string(),
        PurchaseOrderNumber: z.string(),
        LineNumber: z.union([z.string(), z.number()])
    })
    .passthrough();

const PurchaseOrderLineSchema = z
    .object({
        id: z.string(),
        dataAreaId: z.string(),
        PurchaseOrderNumber: z.string(),
        LineNumber: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync purchase order lines.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrderLine: PurchaseOrderLineSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.skip : 0;

        // Blocker: PurchaseOrderLinesV2 does not expose a modified timestamp
        // in this environment; no changed-since filter or deleted-record endpoint
        // exists, so full refresh with delete tracking is required.
        if (offset === 0) {
            await nango.trackDeletesStart('PurchaseOrderLine');
        }

        let hasMore = true;
        const limit = 1000;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
                endpoint: '/data/PurchaseOrderLinesV2',
                params: {
                    'cross-company': 'true',
                    $top: limit,
                    $skip: offset,
                    $orderby: 'dataAreaId asc,PurchaseOrderNumber asc,LineNumber asc'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const envelope = ODataEnvelopeSchema.safeParse(response.data);
            if (!envelope.success) {
                throw new Error('Unexpected response shape from PurchaseOrderLinesV2');
            }

            const page = envelope.data.value;

            const lines = page.map((raw: unknown) => {
                const parsed = ProviderPurchaseOrderLineSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse purchase order line: ${parsed.error.message}`);
                }

                const record = parsed.data;
                const dataAreaId = typeof record.dataAreaId === 'string' ? record.dataAreaId : String(record.dataAreaId);
                const purchaseOrderNumber = typeof record.PurchaseOrderNumber === 'string' ? record.PurchaseOrderNumber : String(record.PurchaseOrderNumber);
                const lineNumber = typeof record.LineNumber === 'string' ? record.LineNumber : String(record.LineNumber);
                const id = `${dataAreaId}|${purchaseOrderNumber}|${lineNumber}`;

                return {
                    ...record,
                    id,
                    dataAreaId,
                    PurchaseOrderNumber: purchaseOrderNumber,
                    LineNumber: lineNumber
                };
            });

            if (lines.length > 0) {
                await nango.batchSave(lines, 'PurchaseOrderLine');
            }

            offset += page.length;
            await nango.saveCheckpoint({ skip: offset });

            if (page.length < limit) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PurchaseOrderLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
