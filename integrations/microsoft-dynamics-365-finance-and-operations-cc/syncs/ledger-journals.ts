import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRecordSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional().nullable(),
        Description: z.string().optional().nullable(),
        IsPosted: z.string().optional().nullable(),
        AccountingCurrency: z.string().optional().nullable(),
        PostingLayer: z.string().optional().nullable(),
        JournalTotalCredit: z.number().optional().nullable(),
        JournalTotalDebit: z.number().optional().nullable()
    })
    .passthrough();

const LedgerJournalSchema = z.object({
    id: z.string(),
    DataAreaId: z.string(),
    JournalBatchNumber: z.string(),
    JournalName: z.string().optional(),
    Description: z.string().optional(),
    IsPosted: z.string().optional(),
    AccountingCurrency: z.string().optional(),
    PostingLayer: z.string().optional(),
    JournalTotalCredit: z.number().optional(),
    JournalTotalDebit: z.number().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync general ledger journal headers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LedgerJournal: LedgerJournalSchema
    },

    exec: async (nango) => {
        // Blocker: LedgerJournalHeaders exposes no filterable modified-timestamp field,
        // no changed-records endpoint, and no deleted-record endpoint. Full refresh with
        // trackDeletes is required per company (dataAreaId). Persist the current
        // $skip offset so a long crawl can resume inside the same delete window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalHeaders',
            params: {
                $orderby: 'dataAreaId asc,JournalBatchNumber asc',
                'cross-company': 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderRecordSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse LedgerJournalHeaders page: ${parsedPage.error.message}`);
            }

            const journals = parsedPage.data.map((record) => ({
                id: `${record.dataAreaId}-${record.JournalBatchNumber}`,
                DataAreaId: record.dataAreaId,
                JournalBatchNumber: record.JournalBatchNumber,
                ...(record.JournalName != null && { JournalName: record.JournalName }),
                ...(record.Description != null && { Description: record.Description }),
                ...(record.IsPosted != null && { IsPosted: record.IsPosted }),
                ...(record.AccountingCurrency != null && { AccountingCurrency: record.AccountingCurrency }),
                ...(record.PostingLayer != null && { PostingLayer: record.PostingLayer }),
                ...(record.JournalTotalCredit != null && { JournalTotalCredit: record.JournalTotalCredit }),
                ...(record.JournalTotalDebit != null && { JournalTotalDebit: record.JournalTotalDebit })
            }));

            if (!trackingStarted && journals.length > 0) {
                await nango.trackDeletesStart('LedgerJournal');
                trackingStarted = true;
            }

            if (journals.length > 0) {
                await nango.batchSave(journals, 'LedgerJournal');
            }

            offset += parsedPage.data.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('LedgerJournal');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
