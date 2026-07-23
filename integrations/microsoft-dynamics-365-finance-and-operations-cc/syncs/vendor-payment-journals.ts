import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VendorPaymentJournalSchema = z.object({
    id: z.string(),
    dataAreaId: z.string().optional(),
    JournalBatchNumber: z.string().optional(),
    JournalName: z.string().optional(),
    ChargeBearer: z.number().optional(),
    OverrideSalesTax: z.string().optional(),
    Description: z.string().optional(),
    CategoryPurpose: z.number().optional(),
    IsPosted: z.string().optional(),
    LocalInstrument: z.number().optional(),
    ServiceLevel: z.number().optional()
});

const ProviderVendorPaymentJournalHeaderSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        JournalName: z.string().optional(),
        ChargeBearer: z.number().optional(),
        OverrideSalesTax: z.string().optional(),
        Description: z.string().optional(),
        CategoryPurpose: z.number().optional(),
        IsPosted: z.string().optional(),
        LocalInstrument: z.number().optional(),
        ServiceLevel: z.number().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync vendor (AP) payment journal headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        VendorPaymentJournal: VendorPaymentJournalSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        if (skip === 0) {
            await nango.trackDeletesStart('VendorPaymentJournal');
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorPaymentJournalHeaders',
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
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const journals: z.infer<typeof VendorPaymentJournalSchema>[] = [];

            for (const raw of page) {
                const parsed = ProviderVendorPaymentJournalHeaderSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Failed to parse VendorPaymentJournalHeaders record: ${parsed.error.message}`);
                }

                const record = parsed.data;
                const dataAreaId = record.dataAreaId ?? '';
                const journalBatchNumber = record.JournalBatchNumber ?? '';

                if (!dataAreaId || !journalBatchNumber) {
                    throw new Error('Missing required key fields in VendorPaymentJournalHeaders record');
                }

                journals.push({
                    id: `${dataAreaId}|${journalBatchNumber}`,
                    dataAreaId: record.dataAreaId,
                    JournalBatchNumber: record.JournalBatchNumber,
                    JournalName: record.JournalName,
                    ChargeBearer: record.ChargeBearer,
                    OverrideSalesTax: record.OverrideSalesTax,
                    Description: record.Description,
                    CategoryPurpose: record.CategoryPurpose,
                    IsPosted: record.IsPosted,
                    LocalInstrument: record.LocalInstrument,
                    ServiceLevel: record.ServiceLevel
                });
            }

            if (journals.length > 0) {
                await nango.batchSave(journals, 'VendorPaymentJournal');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('VendorPaymentJournal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
