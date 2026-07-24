import { createSync } from 'nango';
import { z } from 'zod';

const CustomerPaymentJournalHeaderSchema = z.object({
    id: z.string(),
    dataAreaId: z.string().optional(),
    JournalBatchNumber: z.string().optional(),
    JournalName: z.string().optional(),
    OverrideSalesTax: z.string().optional(),
    Description: z.string().optional(),
    IsPosted: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const ProviderItemSchema = z.object({
    dataAreaId: z.string().optional(),
    JournalBatchNumber: z.string().optional(),
    JournalName: z.string().optional(),
    OverrideSalesTax: z.string().optional(),
    Description: z.string().optional(),
    IsPosted: z.string().optional()
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

        for await (const page of nango.paginate({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentJournalHeaders',
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
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        })) {
            const items = z.array(z.unknown()).parse(page);
            const headers = items.map((item) => {
                const parsed = ProviderItemSchema.safeParse(item);

                if (!parsed.success) {
                    throw new Error(`Failed to parse CustomerPaymentJournalHeader: ${JSON.stringify(parsed.error.issues)}`);
                }

                const raw = parsed.data;
                if (!raw.dataAreaId || !raw.JournalBatchNumber) {
                    throw new Error('Missing required key fields in CustomerPaymentJournalHeader record');
                }
                const dataAreaId = raw.dataAreaId;
                const journalBatchNumber = raw.JournalBatchNumber;
                return {
                    id: `${dataAreaId}-${journalBatchNumber}`,
                    dataAreaId: raw.dataAreaId,
                    JournalBatchNumber: raw.JournalBatchNumber,
                    JournalName: raw.JournalName,
                    OverrideSalesTax: raw.OverrideSalesTax,
                    Description: raw.Description,
                    IsPosted: raw.IsPosted
                };
            });

            if (!trackingStarted && headers.length > 0) {
                await nango.trackDeletesStart('CustomerPaymentJournalHeader');
                trackingStarted = true;
            }

            if (headers.length > 0) {
                await nango.batchSave(headers, 'CustomerPaymentJournalHeader');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('CustomerPaymentJournalHeader');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
