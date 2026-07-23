import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    data_area_id: z.string().describe('Company/data area ID. Example: "dat"'),
    journal_batch_number: z.string().optional().describe('Parent journal batch number to scope lines to a single journal. Example: "DAT-000015"'),
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of records to return. Defaults to 100.')
});

const ProviderLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        LineNumber: z.number().optional(),
        AccountType: z.string().optional(),
        AccountDisplayValue: z.string().optional(),
        OffsetAccountType: z.string().optional(),
        OffsetAccountDisplayValue: z.string().optional(),
        AmountCurDebit: z.number().optional(),
        AmountCurCredit: z.number().optional(),
        CurrencyCode: z.string().optional(),
        DueDate: z.string().optional(),
        PaymentReference: z.string().optional(),
        PaymentId: z.string().optional(),
        BankAccountId: z.string().optional(),
        PostingProfile: z.string().optional(),
        MethodOfPayment: z.string().optional(),
        SalesTaxGroup: z.string().optional(),
        ItemSalesTaxGroup: z.string().optional(),
        Description: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    lines: z.array(ProviderLineSchema),
    next_cursor: z.string().optional()
});

function isOdataListResponse(data: unknown): data is { value: unknown[] } {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    if (!('value' in data)) {
        return false;
    }
    return Array.isArray(data.value);
}

const action = createAction({
    description: 'List customer payment journal lines, optionally scoped to a parent journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;

        const filters = [`dataAreaId eq '${input.data_area_id}'`];
        if (input.journal_batch_number) {
            filters.push(`JournalBatchNumber eq '${input.journal_batch_number}'`);
        }

        const params: Record<string, string | number> = {
            $filter: filters.join(' and '),
            $top: limit
        };

        if (input.cursor) {
            const skip = parseInt(input.cursor, 10);
            if (!Number.isNaN(skip)) {
                params['$skip'] = skip;
            }
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentJournalLines',
            params,
            retries: 3
        });

        if (!isOdataListResponse(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain expected array'
            });
        }

        const providerLines = z.array(ProviderLineSchema).safeParse(response.data.value);

        if (!providerLines.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response',
                details: providerLines.error.issues
            });
        }

        const currentOffset = input.cursor ? parseInt(input.cursor, 10) : 0;
        const nextCursor = providerLines.data.length === limit ? String(currentOffset + limit) : undefined;

        return {
            lines: providerLines.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
