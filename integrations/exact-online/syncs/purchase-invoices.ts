import { createSync } from 'nango';
import { z } from 'zod';

const PurchaseInvoiceSchema = z.object({
    id: z.string().describe('EntryID'),
    EntryID: z.string(),
    EntryNumber: z.number().int().optional(),
    Supplier: z.string().optional(),
    AmountDC: z.number().optional(),
    EntryDate: z.string().optional(),
    Status: z.number().int().optional(),
    Modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number().int()
            })
        )
    })
});

const PurchaseEntryItemSchema = z.object({
    EntryID: z.string(),
    EntryNumber: z.union([z.number().int(), z.null()]).optional(),
    Supplier: z.union([z.string(), z.null()]).optional(),
    AmountDC: z.union([z.number(), z.null()]).optional(),
    EntryDate: z.union([z.string(), z.null()]).optional(),
    Status: z.union([z.number().int(), z.null()]).optional(),
    Modified: z.string()
});

const sync = createSync({
    description: 'Sync purchase invoice entries with incremental updates via Modified timestamp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseInvoice: PurchaseInvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        // https://start.exactonline.fr/docs/services/Me/GET
        const meResponse = await nango.get({
            endpoint: 'api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error(`Failed to parse Me response: ${meParsed.error.message}`);
        }

        const meResults = meParsed.data.d.results;
        if (meResults.length === 0 || meResults[0] === undefined) {
            throw new Error('CurrentDivision not found in Me response');
        }

        const division = meResults[0].CurrentDivision;

        // https://start.exactonline.fr/docs/services/PurchaseEntries/GET
        let skip = 0;
        const top = 100;
        let hasMore = true;

        while (hasMore) {
            const response = await nango.get({
                endpoint: `api/v1/${encodeURIComponent(String(division))}/purchaseentry/PurchaseEntries`,
                params: {
                    $select: 'EntryID,EntryNumber,Supplier,AmountDC,EntryDate,Status,Modified',
                    $orderby: 'Modified asc',
                    $skip: String(skip),
                    $top: String(top),
                    ...(updatedAfter && { $filter: `Modified gt datetime'${updatedAfter}'` })
                },
                retries: 3
            });

            const rawData = response.data;
            if (typeof rawData !== 'object' || rawData === null || !('d' in rawData)) {
                throw new Error('Invalid PurchaseEntries response: missing d field');
            }

            const d = rawData.d;
            let items: unknown[];

            if (Array.isArray(d)) {
                items = d;
            } else if (typeof d === 'object' && d !== null && 'results' in d) {
                const results = d.results;
                if (!Array.isArray(results)) {
                    throw new Error('Invalid PurchaseEntries response: d.results is not an array');
                }
                items = results;
            } else {
                throw new Error('Invalid PurchaseEntries response: d is neither an array nor an object with results');
            }

            if (items.length === 0) {
                break;
            }

            const parsedItems = items.map((item) => {
                const parsed = PurchaseEntryItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse PurchaseEntry item: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const invoices = parsedItems.map((record) => ({
                id: record.EntryID,
                EntryID: record.EntryID,
                ...(record.EntryNumber !== null && record.EntryNumber !== undefined && { EntryNumber: record.EntryNumber }),
                ...(record.Supplier !== null && record.Supplier !== undefined && { Supplier: record.Supplier }),
                ...(record.AmountDC !== null && record.AmountDC !== undefined && { AmountDC: record.AmountDC }),
                ...(record.EntryDate !== null && record.EntryDate !== undefined && { EntryDate: record.EntryDate }),
                ...(record.Status !== null && record.Status !== undefined && { Status: record.Status }),
                Modified: record.Modified
            }));

            await nango.batchSave(invoices, 'PurchaseInvoice');

            const lastModified = parsedItems[parsedItems.length - 1]?.Modified;
            if (lastModified) {
                await nango.saveCheckpoint({
                    updated_after: lastModified
                });
            }

            if (items.length < top) {
                hasMore = false;
            } else {
                skip += top;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
