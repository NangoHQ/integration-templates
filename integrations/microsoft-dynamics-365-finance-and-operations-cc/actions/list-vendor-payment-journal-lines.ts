import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/data area ID. Example: "dat"'),
    journalBatchNumber: z.string().optional().describe('Journal batch number to scope lines to a single parent journal. Example: "DAT-000015"'),
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value). Omit for the first page.')
});

const ProviderLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        LineNumber: z.number().optional(),
        AccountType: z.string().optional(),
        OffsetAccountType: z.string().optional(),
        Account: z.string().optional(),
        OffsetAccount: z.string().optional(),
        DebitAmount: z.number().optional(),
        CreditAmount: z.number().optional(),
        CurrencyCode: z.string().optional(),
        Description: z.string().optional(),
        DueDate: z.string().optional(),
        PaymentMethod: z.string().optional(),
        PostingProfile: z.string().optional(),
        TransactionDate: z.string().optional(),
        Voucher: z.string().optional(),
        Worker: z.string().optional(),
        WorkerName: z.string().optional(),
        Status: z.string().optional(),
        IsPosted: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    '@odata.context': z.string().optional(),
    value: z.array(ProviderLineSchema)
});

const OutputSchema = z.object({
    items: z.array(ProviderLineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List vendor payment journal lines, optionally scoped to a parent journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid numeric string representing an OData $skip value.'
            });
        }

        const params: Record<string, string | number> = {
            $top: pageSize,
            $skip: skip
        };

        const filters: string[] = [`dataAreaId eq '${input.dataAreaId}'`];
        if (input.journalBatchNumber) {
            filters.push(`JournalBatchNumber eq '${input.journalBatchNumber}'`);
        }
        params['$filter'] = filters.join(' and ');

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorPaymentJournalLines',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.value;

        const nextCursor = items.length === pageSize ? String(skip + pageSize) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
