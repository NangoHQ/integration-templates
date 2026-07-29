import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company / legal entity ID. Example: "dat"'),
    journalBatchNumber: z.string().optional().describe('Parent journal batch number to scope lines to. Example: "DAT-000015"'),
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of lines to return per page. Default: 100.')
});

const VendorPaymentJournalLineSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        LineNumber: z.number().optional(),
        AccountType: z.string().optional(),
        Account: z.string().optional(),
        Description: z.string().optional(),
        DebitAmount: z.number().optional(),
        CreditAmount: z.number().optional(),
        AmountCurDebit: z.number().optional(),
        AmountCurCredit: z.number().optional(),
        CurrencyCode: z.string().optional(),
        TransactionDate: z.string().optional(),
        DueDate: z.string().optional(),
        Invoice: z.string().optional(),
        Text: z.string().optional(),
        OffsetAccountType: z.string().optional(),
        OffsetAccount: z.string().optional(),
        OffsetText: z.string().optional(),
        Voucher: z.string().optional(),
        PostingProfile: z.string().optional(),
        PaymentMethod: z.string().optional(),
        BankAccountId: z.string().optional(),
        CompanyBankAccountId: z.string().optional(),
        PaymentId: z.string().optional(),
        PaymentReference: z.string().optional(),
        Status: z.string().optional(),
        Approved: z.string().optional(),
        DocumentNum: z.string().optional(),
        CashDiscountAmount: z.number().optional(),
        CashDiscountDate: z.string().optional(),
        SalesTaxGroup: z.string().optional(),
        ItemSalesTaxGroup: z.string().optional(),
        DimensionDisplayValue: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(VendorPaymentJournalLineSchema),
    next_cursor: z.string().optional()
});

const ODataListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List vendor payment journal lines, optionally scoped to a parent journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const dataAreaId = input.dataAreaId ?? 'dat';
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor. Must be a numeric $skip value.'
            });
        }

        const filters: string[] = [`dataAreaId eq '${dataAreaId}'`];
        if (input.journalBatchNumber) {
            filters.push(`JournalBatchNumber eq '${input.journalBatchNumber}'`);
        }

        const params: Record<string, string | number> = {
            $filter: filters.join(' and '),
            $top: limit,
            $skip: skip
        };

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/VendorPaymentJournalLines',
            params,
            retries: 3
        });

        const listResponse = ODataListResponseSchema.parse(response.data);
        const items = listResponse.value.map((item) => VendorPaymentJournalLineSchema.parse(item));

        let next_cursor: string | undefined;
        if (listResponse['@odata.nextLink'] != null) {
            const nextUrl = new URL(listResponse['@odata.nextLink']);
            const nextSkip = nextUrl.searchParams.get('$skip');
            next_cursor = nextSkip ?? String(skip + items.length);
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
