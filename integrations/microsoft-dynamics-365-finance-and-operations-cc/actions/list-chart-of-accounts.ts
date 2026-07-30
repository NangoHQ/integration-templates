import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderChartOfAccountsSchema = z
    .object({
        ChartOfAccounts: z.string().optional().describe('Chart of accounts identifier. Example: "USMF"'),
        Description: z.string().optional().nullable().describe('Chart of accounts description'),
        dataAreaId: z.string().optional().describe('Company / data area ID. Example: "dat"')
    })
    .passthrough();

const OutputItemSchema = z.object({
    chart_of_accounts: z.string().optional().describe('Chart of accounts identifier'),
    description: z.string().optional().describe('Chart of accounts description'),
    data_area_id: z.string().optional().describe('Company / data area ID')
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page')
});

type ProviderChartOfAccounts = z.infer<typeof ProviderChartOfAccountsSchema>;

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List charts of accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer representing the skip offset.'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/ChartOfAccounts',
            params: {
                $top: PAGE_SIZE,
                $skip: skip,
                'cross-company': 'true'
            },
            retries: 3
        });

        const rawValue = response.data;
        if (!rawValue || typeof rawValue !== 'object' || !Array.isArray(rawValue.value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ChartOfAccounts endpoint.'
            });
        }

        const providerItems: ProviderChartOfAccounts[] = rawValue.value.map((item: unknown) => {
            const parsed = ProviderChartOfAccountsSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse a ChartOfAccounts response item.'
                });
            }
            return parsed.data;
        });

        const items = providerItems.map((item: ProviderChartOfAccounts) => ({
            ...(item.ChartOfAccounts != null && { chart_of_accounts: item.ChartOfAccounts }),
            ...(item.Description != null && { description: item.Description }),
            ...(item.dataAreaId != null && { data_area_id: item.dataAreaId })
        }));

        const nextLink = typeof rawValue['@odata.nextLink'] === 'string' ? rawValue['@odata.nextLink'] : undefined;
        const nextCursor = nextLink ? String(skip + providerItems.length) : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
