import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawCustomerPaymentJournalHeaderSchema = z.object({
    dataAreaId: z.string().optional(),
    JournalBatchNumber: z.string().optional(),
    IsPosted: z.string().optional(),
    Description: z.string().nullable().optional(),
    JournalName: z.string().optional(),
    JournalType: z.string().optional(),
    PostedDateTime: z.string().optional(),
    DetailSummaryPosting: z.string().optional(),
    InUseBy: z.string().optional(),
    LineCount: z.number().optional()
});

const CustomerPaymentJournalHeaderSchema = z.object({
    id: z.string(),
    dataAreaId: z.string().optional(),
    journalBatchNumber: z.string().optional(),
    isPosted: z.string().optional(),
    description: z.string().optional(),
    journalName: z.string().optional(),
    journalType: z.string().optional(),
    postedDateTime: z.string().optional(),
    detailSummaryPosting: z.string().optional(),
    inUseBy: z.string().optional(),
    lineCount: z.number().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync customer (AR) payment journal headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomerPaymentJournalHeader: CustomerPaymentJournalHeaderSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;

        // offset can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. On a resumed execution we must
        // NOT call trackDeletesStart again — that would open a fresh window covering only the
        // remaining pages, and trackDeletesEnd would then treat every journal from the
        // already-processed pages as missing and delete it. trackDeletesStart is only actually
        // called once we've seen a validated page that contains records, so an empty/anomalous
        // response never opens (and therefore never completes) a window that would wipe the
        // whole cache.
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentJournalHeaders',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,JournalBatchNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;

            const journals = items.map((item) => {
                const parseResult = RawCustomerPaymentJournalHeaderSchema.safeParse(item);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse customer payment journal: ${parseResult.error.message}`);
                }
                const record = parseResult.data;
                const recordDataAreaId = record.dataAreaId ?? '';
                const batchNumber = record.JournalBatchNumber ?? '';
                const id = `${recordDataAreaId}|${batchNumber}`;

                return {
                    id,
                    ...(record.dataAreaId !== undefined && { dataAreaId: record.dataAreaId }),
                    ...(record.JournalBatchNumber !== undefined && { journalBatchNumber: record.JournalBatchNumber }),
                    ...(record.IsPosted !== undefined && { isPosted: record.IsPosted }),
                    ...(record.Description != null && { description: record.Description }),
                    ...(record.JournalName !== undefined && { journalName: record.JournalName }),
                    ...(record.JournalType !== undefined && { journalType: record.JournalType }),
                    ...(record.PostedDateTime !== undefined && { postedDateTime: record.PostedDateTime }),
                    ...(record.DetailSummaryPosting !== undefined && { detailSummaryPosting: record.DetailSummaryPosting }),
                    ...(record.InUseBy !== undefined && { inUseBy: record.InUseBy }),
                    ...(record.LineCount !== undefined && { lineCount: record.LineCount })
                };
            });

            if (!trackingStarted && journals.length > 0) {
                await nango.trackDeletesStart('CustomerPaymentJournalHeader');
                trackingStarted = true;
            }

            if (journals.length > 0) {
                await nango.batchSave(journals, 'CustomerPaymentJournalHeader');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('CustomerPaymentJournalHeader');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
