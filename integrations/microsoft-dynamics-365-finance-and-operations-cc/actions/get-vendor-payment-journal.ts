import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    journalBatchNumber: z.string().describe('Vendor payment journal batch number. Example: "DAT-000015"')
});

const ProviderVendorPaymentJournalSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        Description: z.string().nullable().optional(),
        JournalName: z.string().nullable().optional(),
        IsPosted: z.string().nullable().optional(),
        PostedDateTime: z.string().nullable().optional(),
        TransactionCurrency: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string().optional(),
    journalBatchNumber: z.string().optional(),
    description: z.string().optional(),
    journalName: z.string().optional(),
    isPosted: z.string().optional(),
    postedDateTime: z.string().optional(),
    transactionCurrency: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a vendor payment journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDataAreaId = encodeURIComponent(input.dataAreaId);
        const encodedJournalBatchNumber = encodeURIComponent(input.journalBatchNumber);

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: `/data/VendorPaymentJournalHeaders(dataAreaId='${encodedDataAreaId}',JournalBatchNumber='${encodedJournalBatchNumber}')`,
            retries: 3
        });

        const providerJournal = ProviderVendorPaymentJournalSchema.parse(response.data);

        return {
            ...(providerJournal.dataAreaId !== undefined && { dataAreaId: providerJournal.dataAreaId }),
            ...(providerJournal.JournalBatchNumber !== undefined && { journalBatchNumber: providerJournal.JournalBatchNumber }),
            ...(providerJournal.Description != null && { description: providerJournal.Description }),
            ...(providerJournal.JournalName != null && { journalName: providerJournal.JournalName }),
            ...(providerJournal.IsPosted != null && { isPosted: providerJournal.IsPosted }),
            ...(providerJournal.PostedDateTime != null && { postedDateTime: providerJournal.PostedDateTime }),
            ...(providerJournal.TransactionCurrency != null && { transactionCurrency: providerJournal.TransactionCurrency })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
