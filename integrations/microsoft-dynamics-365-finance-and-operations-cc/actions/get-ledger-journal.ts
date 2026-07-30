import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity code. Example: "dat"'),
    journalBatchNumber: z.string().describe('Journal batch number identifier. Example: "DAT-000015"')
});

const ProviderSchema = z
    .object({
        '@odata.context': z.string().optional(),
        '@odata.etag': z.string().optional(),
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        AccountingCurrency: z.string().optional().nullable(),
        JournalName: z.string().optional().nullable(),
        IntegrationKey: z.string().optional().nullable(),
        Description: z.string().optional().nullable(),
        PostingLayer: z.string().optional().nullable(),
        IsPosted: z.string().optional().nullable(),
        JournalTotalCredit: z.number().optional().nullable(),
        JournalTotalDebit: z.number().optional().nullable()
    })
    .passthrough();

const OutputSchema = ProviderSchema;

const action = createAction({
    description: 'Retrieve a general ledger journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const url = `/data/LedgerJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber.replace(/'/g, "''"))}')`;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: url,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Ledger journal not found for dataAreaId '${input.dataAreaId}' and journalBatchNumber '${input.journalBatchNumber}'.`
            });
        }

        const journal = ProviderSchema.parse(response.data);
        return journal;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
