import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    journalName: z.string().describe('Existing journal name (setup) to use for the journal header. Example: "EXPJRN"')
});

const ProviderResponseSchema = z.object({
    dataAreaId: z.string().optional(),
    JournalBatchNumber: z.string().optional(),
    JournalName: z.string().optional(),
    IsPosted: z.string().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string().optional(),
    journalBatchNumber: z.string().optional(),
    journalName: z.string().optional(),
    isPosted: z.string().optional()
});

const action = createAction({
    description: 'Create a general ledger journal header',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalHeaders',
            data: {
                dataAreaId: input.dataAreaId,
                JournalName: input.journalName
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.dataAreaId !== undefined && { dataAreaId: providerData.dataAreaId }),
            ...(providerData.JournalBatchNumber !== undefined && { journalBatchNumber: providerData.JournalBatchNumber }),
            ...(providerData.JournalName !== undefined && { journalName: providerData.JournalName }),
            ...(providerData.IsPosted !== undefined && { isPosted: providerData.IsPosted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
