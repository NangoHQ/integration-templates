import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.')
});

const MainAccountSchema = z
    .object({
        MainAccountId: z.string(),
        Name: z.string().optional().nullable(),
        ChartOfAccounts: z.string().optional().nullable(),
        AccountType: z.string().optional().nullable(),
        MainAccountCategory: z.string().optional().nullable(),
        CurrencyCode: z.string().optional().nullable(),
        ActiveFrom: z.string().optional().nullable(),
        ActiveTo: z.string().optional().nullable(),
        OpeningAccount: z.string().optional().nullable(),
        ClosingAccount: z.string().optional().nullable(),
        ExchangeRateType: z.string().optional().nullable(),
        ReportingExchangeRateType: z.string().optional().nullable(),
        ConsolidationExchangeRateType: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(MainAccountSchema),
    next_cursor: z.string().optional()
});

const OdataListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional(),
    '@odata.context': z.string().optional()
});

const action = createAction({
    description: 'List general ledger main accounts.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/MainAccounts',
            params: {
                $top: String(limit),
                ...(skip > 0 && { $skip: String(skip) })
            },
            retries: 3
        });

        const parsed = OdataListResponseSchema.parse(response.data);
        const items = parsed.value.map((item) => MainAccountSchema.parse(item));

        const nextCursor = parsed['@odata.nextLink'] ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
