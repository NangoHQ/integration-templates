import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    data_area_id: z.string().optional().describe("Company data area ID. Defaults to the caller's default company if omitted."),
    cross_company: z.boolean().optional().describe('Whether to query across all companies.')
});

const LedgerJournalHeaderSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        JournalName: z.string().optional(),
        Description: z.string().optional(),
        IsPosted: z.string().optional(),
        JournalType: z.string().optional(),
        PostedDateTime: z.string().optional(),
        NumberOfLines: z.number().optional()
    })
    .passthrough();

const ODataListResponseSchema = z
    .object({
        value: z.array(z.unknown()),
        '@odata.nextLink': z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(LedgerJournalHeaderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger journal headers',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        let skip = 0;
        if (input.cursor) {
            const parsed = parseInt(input.cursor, 10);
            if (!isNaN(parsed)) {
                skip = parsed;
            }
        }

        const params: Record<string, string | number> = {
            ['$top']: pageSize,
            ['$skip']: skip
        };

        if (input.data_area_id) {
            params['$filter'] = `dataAreaId eq '${input.data_area_id.replace(/'/g, "''")}'`;
        }

        // A company filter is scoped to the caller's default legal entity unless cross-company
        // is enabled, so requesting a specific (potentially non-default) data_area_id must also
        // enable cross-company, in addition to the caller's explicit cross_company flag.
        if (input.cross_company || input.data_area_id) {
            params['cross-company'] = 'true';
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalHeaders',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const rawResponse = ODataListResponseSchema.parse(response.data);
        const items = rawResponse.value.map((item: unknown) => LedgerJournalHeaderSchema.parse(item));

        const nextLink = rawResponse['@odata.nextLink'];
        let nextCursor: string | undefined;
        if (nextLink) {
            const nextUrl = new URL(nextLink);
            const nextSkip = nextUrl.searchParams.get('$skip');
            if (nextSkip) {
                nextCursor = nextSkip;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
