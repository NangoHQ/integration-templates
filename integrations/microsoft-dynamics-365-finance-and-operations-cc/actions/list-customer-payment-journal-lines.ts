import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company / data area ID to scope results. Example: "dat"'),
    journalBatchNumber: z.string().optional().describe('Journal batch number to filter lines by a single parent journal. Example: "DAT-000015"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 1000.')
});

const ProviderLineSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderLineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer payment journal lines, optionally scoped to a parent journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 1000;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const filterParts: string[] = [];
        if (input.dataAreaId) {
            filterParts.push(`dataAreaId eq '${input.dataAreaId.replace(/'/g, "''")}'`);
        }
        if (input.journalBatchNumber) {
            filterParts.push(`JournalBatchNumber eq '${input.journalBatchNumber.replace(/'/g, "''")}'`);
        }

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip,
            'cross-company': 'true'
        };
        if (filterParts.length > 0) {
            params['$filter'] = filterParts.join(' and ');
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentJournalLines',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => ProviderLineSchema.parse(item));

        const nextCursor = providerResponse['@odata.nextLink'] ? String(skip + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
