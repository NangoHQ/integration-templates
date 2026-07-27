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

        // skip can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. On a resumed execution we must
        // NOT call trackDeletesStart again — that would open a fresh window covering only the
        // remaining pages, and trackDeletesEnd would then treat every journal from the
        // already-processed pages as missing and delete it. trackDeletesStart is only actually
        // called once we've seen a validated page that contains records, so an empty/anomalous
        // response never opens (and therefore never completes) a window that would wipe the
        // whole cache.
        let trackingStarted = skip > 0;

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

            if (!trackingStarted && records.length > 0) {
                await nango.trackDeletesStart('LedgerJournal');
                trackingStarted = true;
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'LedgerJournal');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('LedgerJournal');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
