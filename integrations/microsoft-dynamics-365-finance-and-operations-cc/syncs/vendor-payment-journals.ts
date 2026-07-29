import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawVendorPaymentJournalSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().nullish(),
        Description: z.string().nullish(),
        IsPosted: z.string().nullish(),
        OverrideSalesTax: z.string().nullish(),
        ChargeBearer: z.number().nullish(),
        CategoryPurpose: z.number().nullish(),
        LocalInstrument: z.number().nullish(),
        ServiceLevel: z.number().nullish()
    })
    .passthrough();

const VendorPaymentJournalSchema = z
    .object({
        id: z.string(),
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional(),
        Description: z.string().optional(),
        IsPosted: z.string().optional(),
        OverrideSalesTax: z.string().optional(),
        ChargeBearer: z.number().optional(),
        CategoryPurpose: z.number().optional(),
        LocalInstrument: z.number().optional(),
        ServiceLevel: z.number().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync vendor (AP) payment journal headers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        VendorPaymentJournal: VendorPaymentJournalSchema
    },

    exec: async (nango) => {
        // Blocker: VendorPaymentJournalHeaders exposes no filterable modified
        // timestamp in this environment, so full refresh is required. Persist
        // the current $skip offset so an interrupted crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        if (!trackingStarted) {
            await nango.trackDeletesStart('VendorPaymentJournal');
            trackingStarted = true;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorPaymentJournalHeaders',
            params: {
                $filter: "dataAreaId eq 'dat'",
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
            const journals = page.map((raw) => {
                const record = RawVendorPaymentJournalSchema.parse(raw);
                const mapped: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(record)) {
                    if (value !== null && !key.startsWith('@odata.')) {
                        mapped[key] = value;
                    }
                }
                mapped['id'] = `${record.dataAreaId}|${record.JournalBatchNumber}`;
                return VendorPaymentJournalSchema.parse(mapped);
            });

            if (journals.length > 0) {
                await nango.batchSave(journals, 'VendorPaymentJournal');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('VendorPaymentJournal');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
