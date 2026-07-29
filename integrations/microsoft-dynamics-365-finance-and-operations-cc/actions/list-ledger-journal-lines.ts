import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    dataAreaId: z.string().min(1),
    journalBatchNumber: z.string().optional(),
    limit: z.number().min(1).max(10000).optional(),
    cursor: z.string().optional()
});

const CursorSchema = z
    .string()
    .transform((s) => Number(s))
    .pipe(z.number().int().min(0));

const RawResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown()))
});

const OutputSchema = z.object({
    lines: z.array(z.record(z.string(), z.unknown())),
    nextCursor: z.string().nullable()
});

export default createAction({
    description: 'List general ledger journal lines, optionally scoped to a parent journal',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input) => {
        const limit = input.limit ?? 100;
        let skip = 0;
        if (input.cursor) {
            const cursorResult = CursorSchema.safeParse(input.cursor);
            if (cursorResult.success) {
                skip = cursorResult.data;
            }
        }

        const filters = [`dataAreaId eq '${input.dataAreaId}'`];
        if (input.journalBatchNumber) {
            filters.push(`JournalBatchNumber eq '${input.journalBatchNumber}'`);
        }

        const queryParams: Record<string, string | number> = {
            $top: limit,
            $skip: skip,
            $filter: filters.join(' and ')
        };

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/LedgerJournalLines',
            params: queryParams,
            retries: 3
        });

        const parsed = RawResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError('Unexpected response format from LedgerJournalLines');
        }

        const lines = parsed.data.value;
        const nextSkip = skip + lines.length;
        const nextCursor = lines.length === limit ? String(nextSkip) : null;

        return {
            lines,
            nextCursor
        };
    }
});
