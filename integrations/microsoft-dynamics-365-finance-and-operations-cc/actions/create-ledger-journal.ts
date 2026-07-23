import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe("Company code / data area ID. Example: 'dat'"),
    JournalName: z.string().describe('Journal name/setup. Example: "EXPJRN"')
});

const ProviderResponseSchema = z
    .object({
        JournalBatchNumber: z.string(),
        JournalName: z.string(),
        dataAreaId: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    JournalBatchNumber: z.string(),
    JournalName: z.string(),
    dataAreaId: z.string()
});

const action = createAction({
    description: 'Create a general ledger journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalHeaders',
            data: {
                dataAreaId: input.dataAreaId,
                JournalName: input.JournalName
            },
            retries: 1
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            JournalBatchNumber: providerData.JournalBatchNumber,
            JournalName: providerData.JournalName,
            dataAreaId: providerData.dataAreaId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
