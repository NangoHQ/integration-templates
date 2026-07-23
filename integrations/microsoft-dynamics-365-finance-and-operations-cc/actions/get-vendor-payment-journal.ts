import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    journalBatchNumber: z.string().describe('Journal batch number. Example: "DAT-000009"')
});

const ProviderVendorPaymentJournalSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
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

const OutputSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
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

const action = createAction({
    description: 'Retrieve a vendor payment journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/VendorPaymentJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId)}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber)}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vendor payment journal not found',
                dataAreaId: input.dataAreaId,
                journalBatchNumber: input.journalBatchNumber
            });
        }

        const providerJournal = ProviderVendorPaymentJournalSchema.parse(response.data);

        return providerJournal;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
