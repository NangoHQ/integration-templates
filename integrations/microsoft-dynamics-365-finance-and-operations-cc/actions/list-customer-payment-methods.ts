import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. Default: 100.')
});

const CustomerPaymentMethodSchema = z
    .object({
        '@odata.etag': z.string().optional(),
        dataAreaId: z.string().optional(),
        Name: z.string().optional(),
        Description: z.string().optional(),
        PaymentAccountDisplayValue: z.string().optional(),
        AccountType: z.string().optional(),
        PaymentType: z.string().optional(),
        PrimaryMethodPayment: z.string().optional(),
        DirectDebit: z.string().optional(),
        IsSEPA: z.string().optional(),
        LastFileDate: z.string().optional(),
        ExportBillOfExchangeDuringInvoicePosting: z.string().optional(),
        ValidateCheckNumberIsMandatory: z.string().optional(),
        ImportFormatClassName: z.string().optional(),
        PaymentStatus: z.string().optional(),
        AttributePaymentIdEnabled: z.string().optional(),
        ValidatePaymentReferenceIsMandatory: z.string().optional(),
        ValidateDepositSlipIsMandatory: z.string().optional(),
        SplitPayment: z.string().optional(),
        SATPaymentType: z.string().nullable().optional(),
        SumByPeriod: z.string().optional(),
        ValidateOffsetTransactionTypeIsBank: z.string().optional(),
        AttributeBelgianStructuredPaymentIdEnabled: z.string().optional(),
        ReturnLayoutGroupId: z.string().optional(),
        PaymentJournalName: z.string().optional(),
        ExportLayoutGroupId: z.string().optional(),
        ERFormatMapping: z.string().optional(),
        ERModelMappingTable: z.number().optional(),
        CreateAndDrawBillOfExchangeDuringInvoicePosting: z.string().optional(),
        ERSolution: z.string().optional(),
        EnablePostdatedCheckClearingPosting: z.string().optional(),
        BridgingPostingEnabled: z.string().optional(),
        RemittanceFormatClassName: z.string().optional(),
        BankTransactionType: z.string().optional(),
        ValidateTransactionTypeIsBank: z.string().optional(),
        BillOfExchangeDraftType: z.string().optional(),
        DiscountGracePeriodDays: z.number().optional(),
        ReturnFormatClassName: z.string().optional(),
        LastFileNumberToday: z.number().optional(),
        ERProvider: z.string().optional(),
        ExportFormatClassName: z.string().optional(),
        DescriptionPrimaryMethodPayment: z.string().optional(),
        AttributeThirdPartyBankEnabled: z.string().optional(),
        AttributePaymentAccountEnabled: z.string().optional(),
        BridgingPostingAccountDisplayValue: z.string().optional(),
        UseGERConfiguration: z.string().optional(),
        LastFileNumber: z.number().optional(),
        PostingProfileBillsRemitCollection: z.string().optional(),
        PostingProfileBillsRemitDiscount: z.string().optional(),
        DimensionControl: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CustomerPaymentMethodSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer payment methods.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentMethods',
            params: {
                $top: String(limit),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(CustomerPaymentMethodSchema)
            })
            .parse(response.data);

        const items = providerResponse.value;
        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
