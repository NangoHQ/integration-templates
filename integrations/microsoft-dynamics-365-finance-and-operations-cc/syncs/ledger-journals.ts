import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const LedgerJournalSchema = z.object({
    id: z.string(),
    JournalBatchNumber: z.string(),
    dataAreaId: z.string(),
    JournalName: z.string().optional(),
    Description: z.string().optional(),
    IsPosted: z.string().optional(),
    JournalType: z.string().optional(),
    CreatedDateTime: z.string().optional(),
    ModifiedDateTime: z.string().optional()
});

const ProviderRecordSchema = z.object({
    JournalBatchNumber: z.string(),
    dataAreaId: z.string(),
    JournalName: z.string().nullish(),
    Description: z.string().nullish(),
    IsPosted: z.string().nullish(),
    JournalType: z.string().nullish(),
    CreatedDateTime: z.string().nullish(),
    ModifiedDateTime: z.string().nullish()
});

const sync = createSync({
    description: 'Sync general ledger journal headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LedgerJournal: LedgerJournalSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        // trackDeletesStart is called once the very next page (fresh or resumed) has been
        // fetched and validated below — on every execution, not just when skip === 0 — so a
        // resumed execution still (re-)opens the delete-tracking window, and a failed/invalid
        // page never leaves tracking "started" with nothing validated. Safe/idempotent to call
        // again if a prior execution already started it while the window is open.
        let shouldStartTracking = true;

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        for await (const page of nango.paginate({
            endpoint: '/data/LedgerJournalHeaders',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,JournalBatchNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        })) {
            const items: unknown[] = page;

            const records = items.map((raw) => {
                const parsed = ProviderRecordSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse LedgerJournalHeaders record: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: `${record.dataAreaId}-${record.JournalBatchNumber}`,
                    JournalBatchNumber: record.JournalBatchNumber,
                    dataAreaId: record.dataAreaId,
                    ...(record.JournalName != null && { JournalName: record.JournalName }),
                    ...(record.Description != null && { Description: record.Description }),
                    ...(record.IsPosted != null && { IsPosted: record.IsPosted }),
                    ...(record.JournalType != null && { JournalType: record.JournalType }),
                    ...(record.CreatedDateTime != null && { CreatedDateTime: record.CreatedDateTime }),
                    ...(record.ModifiedDateTime != null && { ModifiedDateTime: record.ModifiedDateTime })
                };
            });

            if (shouldStartTracking) {
                await nango.trackDeletesStart('LedgerJournal');
                shouldStartTracking = false;
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'LedgerJournal');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LedgerJournal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
