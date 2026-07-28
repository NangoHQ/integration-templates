import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('Ledger voucher ID. Example: 444017858')
});

const ReferenceSchema = z.object({
    id: z.number(),
    url: z.string()
});

const PostingSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string(),
    voucher: ReferenceSchema.optional(),
    date: z.string().optional(),
    description: z.string().nullable().optional(),
    account: ReferenceSchema.nullable().optional(),
    amortizationAccount: ReferenceSchema.nullable().optional(),
    amortizationStartDate: z.string().nullable().optional(),
    amortizationEndDate: z.string().nullable().optional(),
    customer: ReferenceSchema.nullable().optional(),
    supplier: ReferenceSchema.nullable().optional(),
    employee: ReferenceSchema.nullable().optional(),
    project: ReferenceSchema.nullable().optional(),
    product: ReferenceSchema.nullable().optional(),
    department: ReferenceSchema.nullable().optional(),
    vatType: ReferenceSchema.nullable().optional(),
    amount: z.number().optional(),
    amountCurrency: z.number().optional(),
    amountGross: z.number().optional(),
    amountGrossCurrency: z.number().optional(),
    currency: ReferenceSchema.nullable().optional(),
    closeGroup: z.number().nullable().optional(),
    invoiceNumber: z.string().optional(),
    termOfPayment: ReferenceSchema.nullable().optional(),
    row: z.number().optional(),
    type: z.string().nullable().optional(),
    externalRef: z.string().optional(),
    systemGenerated: z.boolean().optional(),
    taxTransactionType: z.string().optional(),
    taxTransactionTypeId: z.number().optional(),
    matched: z.boolean().optional(),
    quantityAmount1: z.number().optional(),
    quantityType1: ReferenceSchema.nullable().optional(),
    quantityAmount2: z.number().optional(),
    quantityType2: ReferenceSchema.nullable().optional(),
    isVatReadonly: z.boolean().optional(),
    isAmountVatClosed: z.boolean().optional(),
    postingRuleId: z.number().optional(),
    freeAccountingDimension1: z.number().nullable().optional(),
    freeAccountingDimension2: z.number().nullable().optional(),
    freeAccountingDimension3: z.number().nullable().optional(),
    asset: ReferenceSchema.nullable().optional()
});

const VoucherSchema = z.object({
    id: z.number(),
    version: z.number(),
    url: z.string(),
    date: z.string(),
    number: z.number(),
    tempNumber: z.number().optional(),
    year: z.number(),
    description: z.string().nullable().optional(),
    voucherType: z.string().nullable().optional(),
    reverseVoucher: ReferenceSchema.nullable().optional(),
    postings: z.array(PostingSchema),
    document: z.unknown().nullable().optional(),
    attachment: z.unknown().nullable().optional(),
    externalVoucherNumber: z.string().optional(),
    ediDocument: z.unknown().nullable().optional(),
    supplierVoucherType: z.unknown().nullable().optional(),
    wasAutoMatched: z.boolean().optional(),
    vendorInvoiceNumber: z.string().nullable().optional(),
    numberAsString: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: VoucherSchema
});

const OutputSchema = VoucherSchema;

const action = createAction({
    description: 'Retrieve a general ledger voucher.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const id = typeof input.id === 'number' ? input.id.toString() : input.id;
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/ledger/voucher/${encodeURIComponent(id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ledger voucher not found',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
