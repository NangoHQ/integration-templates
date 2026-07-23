import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    journalBatchNumber: z.string().describe('Journal batch number to delete. Example: "DAT-000015"')
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    journalBatchNumber: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a draft (unposted) general ledger journal header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        await nango.delete({
            endpoint: `/data/LedgerJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId).replace(/'/g, "''")}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber).replace(/'/g, "''")}')`,
            retries: 1
        });

        return {
            dataAreaId: input.dataAreaId,
            journalBatchNumber: input.journalBatchNumber,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
