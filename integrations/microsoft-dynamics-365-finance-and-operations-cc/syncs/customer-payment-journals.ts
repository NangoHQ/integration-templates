import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawCustomerPaymentJournalSchema = z.object({
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

const CustomerPaymentJournalSchema = z.object({
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
        CustomerPaymentJournal: CustomerPaymentJournalSchema
    },

    exec: async (nango) => {
        const dataAreaId = 'dat';
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        if (!trackingStarted) {
            await nango.trackDeletesStart('CustomerPaymentJournal');
            trackingStarted = true;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentJournalHeaders',
            params: {
                $filter: `dataAreaId eq '${dataAreaId}'`,
                $orderby: 'JournalBatchNumber asc'
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
                const parseResult = RawCustomerPaymentJournalSchema.safeParse(item);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse customer payment journal: ${parseResult.error.message}`);
                }
                const record = parseResult.data;
                const recordDataAreaId = record.dataAreaId ?? dataAreaId;
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

            if (journals.length > 0) {
                await nango.batchSave(journals, 'CustomerPaymentJournal');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('CustomerPaymentJournal');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
