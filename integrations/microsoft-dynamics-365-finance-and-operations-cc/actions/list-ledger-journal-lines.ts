import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code (data area ID). Example: "dat"'),
    journalBatchNumber: z.string().optional().describe('Journal batch number to filter lines by. Example: "DAT-000015"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page.')
});

const LedgerJournalLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        Voucher: z.string().optional(),
        AccountType: z.string().optional(),
        AccountDisplayValue: z.string().optional(),
        DebitAmount: z.number().optional(),
        CreditAmount: z.number().optional(),
        CurrencyCode: z.string().optional(),
        LineNumber: z.number().optional(),
        Text: z.string().optional(),
        PostingDate: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(LedgerJournalLineSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger journal lines, optionally scoped to a parent journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filterParts: string[] = [`dataAreaId eq '${input.dataAreaId.replace(/'/g, "''")}'`];
        if (input.journalBatchNumber) {
            filterParts.push(`JournalBatchNumber eq '${input.journalBatchNumber.replace(/'/g, "''")}'`);
        }

        const pageLimit = input.limit ?? 100;
        const params: { $filter: string; $top: number; $skip?: number; 'cross-company': string } = {
            $filter: filterParts.join(' and '),
            $top: pageLimit,
            'cross-company': 'true'
        };

        if (input.cursor) {
            const skip = parseInt(input.cursor, 10);
            if (!Number.isNaN(skip)) {
                params.$skip = skip;
            }
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalLines',
            params,
            retries: 3
        });

        const responseData = z
            .object({
                value: z.array(z.unknown()).optional().default([]),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = responseData.value.map((item: unknown) => {
            return LedgerJournalLineSchema.parse(item);
        });

        let nextCursor: string | undefined;
        if (responseData['@odata.nextLink']) {
            const url = new URL(responseData['@odata.nextLink']);
            const skipParam = url.searchParams.get('$skip');
            if (skipParam) {
                nextCursor = skipParam;
            } else {
                const currentSkip = input.cursor ? parseInt(input.cursor, 10) : 0;
                nextCursor = String(currentSkip + pageLimit);
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
