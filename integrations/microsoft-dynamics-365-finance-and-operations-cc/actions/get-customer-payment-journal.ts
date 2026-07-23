import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    journalBatchNumber: z.string().describe('Customer payment journal batch number. Example: "DAT-000007"')
});

const ProviderSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        JournalName: z.string().optional(),
        Description: z.string().optional(),
        IsPosted: z.string().optional(),
        AccountingDate: z.string().optional(),
        CurrencyCode: z.string().optional(),
        VoucherSeries: z.string().optional(),
        VoucherNumber: z.string().optional(),
        InUseBy: z.string().optional(),
        InUseDatetime: z.string().optional(),
        NumberOfLines: z.number().optional(),
        DetailSummaryTotalAmount: z.number().optional(),
        DetailSummaryTotalAmountCredit: z.number().optional(),
        DetailSummaryTotalAmountDebit: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string().optional(),
    journalBatchNumber: z.string().optional(),
    journalName: z.string().optional(),
    description: z.string().optional(),
    isPosted: z.string().optional(),
    accountingDate: z.string().optional(),
    currencyCode: z.string().optional(),
    voucherSeries: z.string().optional(),
    voucherNumber: z.string().optional(),
    inUseBy: z.string().optional(),
    inUseDatetime: z.string().optional(),
    numberOfLines: z.number().optional(),
    detailSummaryTotalAmount: z.number().optional(),
    detailSummaryTotalAmountCredit: z.number().optional(),
    detailSummaryTotalAmountDebit: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a customer payment journal header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['FinancialsData.read', 'FinancialsData.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/CustomerPaymentJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId)}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber)}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer payment journal not found.',
                dataAreaId: input.dataAreaId,
                journalBatchNumber: input.journalBatchNumber
            });
        }

        const providerData = ProviderSchema.parse(response.data);

        return {
            ...(providerData.dataAreaId !== undefined && { dataAreaId: providerData.dataAreaId }),
            ...(providerData.JournalBatchNumber !== undefined && { journalBatchNumber: providerData.JournalBatchNumber }),
            ...(providerData.JournalName !== undefined && { journalName: providerData.JournalName }),
            ...(providerData.Description !== undefined && { description: providerData.Description }),
            ...(providerData.IsPosted !== undefined && { isPosted: providerData.IsPosted }),
            ...(providerData.AccountingDate !== undefined && { accountingDate: providerData.AccountingDate }),
            ...(providerData.CurrencyCode !== undefined && { currencyCode: providerData.CurrencyCode }),
            ...(providerData.VoucherSeries !== undefined && { voucherSeries: providerData.VoucherSeries }),
            ...(providerData.VoucherNumber !== undefined && { voucherNumber: providerData.VoucherNumber }),
            ...(providerData.InUseBy !== undefined && { inUseBy: providerData.InUseBy }),
            ...(providerData.InUseDatetime !== undefined && { inUseDatetime: providerData.InUseDatetime }),
            ...(providerData.NumberOfLines !== undefined && { numberOfLines: providerData.NumberOfLines }),
            ...(providerData.DetailSummaryTotalAmount !== undefined && { detailSummaryTotalAmount: providerData.DetailSummaryTotalAmount }),
            ...(providerData.DetailSummaryTotalAmountCredit !== undefined && { detailSummaryTotalAmountCredit: providerData.DetailSummaryTotalAmountCredit }),
            ...(providerData.DetailSummaryTotalAmountDebit !== undefined && { detailSummaryTotalAmountDebit: providerData.DetailSummaryTotalAmountDebit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
