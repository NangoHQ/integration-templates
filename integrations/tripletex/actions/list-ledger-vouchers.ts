import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dateFrom: z.string().describe('Start date for the range (inclusive). Format: YYYY-MM-DD. Example: "2024-01-01"'),
    dateTo: z.string().describe('End date for the range (inclusive). Format: YYYY-MM-DD. Example: "2024-12-31"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ReferenceSchema = z
    .object({
        id: z.number().nullish(),
        url: z.string().nullish()
    })
    .passthrough();

const PostingSchema = z
    .object({
        id: z.number().nullish(),
        version: z.number().nullish(),
        url: z.string().nullish(),
        date: z.string().nullish(),
        description: z.string().nullish(),
        account: ReferenceSchema.nullish(),
        amortizationAccount: ReferenceSchema.nullish(),
        amortizationStartDate: z.string().nullish(),
        amortizationEndDate: z.string().nullish(),
        customer: ReferenceSchema.nullish(),
        supplier: ReferenceSchema.nullish(),
        employee: ReferenceSchema.nullish(),
        project: ReferenceSchema.nullish(),
        product: ReferenceSchema.nullish(),
        department: ReferenceSchema.nullish(),
        vatType: ReferenceSchema.nullish(),
        amount: z.number().nullish(),
        amountCurrency: z.number().nullish(),
        amountGross: z.number().nullish(),
        amountGrossCurrency: z.number().nullish(),
        currency: ReferenceSchema.nullish(),
        closeGroup: ReferenceSchema.nullish(),
        invoiceNumber: z.string().nullish(),
        termOfPayment: z.string().nullish(),
        row: z.number().nullish(),
        type: z.string().nullish(),
        externalRef: z.string().nullish(),
        systemGenerated: z.boolean().nullish()
    })
    .passthrough();

const VoucherSchema = z
    .object({
        id: z.number().nullish(),
        version: z.number().nullish(),
        url: z.string().nullish(),
        date: z.string(),
        number: z.number().nullish(),
        tempNumber: z.number().nullish(),
        year: z.number().nullish(),
        description: z.string(),
        voucherType: ReferenceSchema.nullish(),
        reverseVoucher: z.unknown().nullish(),
        postings: z.array(PostingSchema),
        document: ReferenceSchema.nullish(),
        attachment: ReferenceSchema.nullish(),
        externalVoucherNumber: z.string().nullish(),
        ediDocument: ReferenceSchema.nullish(),
        supplierVoucherType: z.string().nullish(),
        wasAutoMatched: z.boolean().nullish(),
        vendorInvoiceNumber: z.string().nullish(),
        displayName: z.string().nullish(),
        numberAsString: z.string().nullish()
    })
    .passthrough();

const ListResponseSchema = z.object({
    fullResultSize: z.number().optional(),
    from: z.number().optional(),
    count: z.number().optional(),
    versionDigest: z.string().nullish(),
    values: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(VoucherSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger vouchers within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            dateFrom: input.dateFrom,
            dateTo: input.dateTo
        };

        if (input.cursor !== undefined && input.cursor !== '') {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer offset string.'
                });
            }
            params['from'] = input.cursor;
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/ledger/voucher',
            params,
            retries: 3
        });

        const parsedResponse = ListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Tripletex API.',
                details: parsedResponse.error.issues
            });
        }

        const { fullResultSize, from, count, values } = parsedResponse.data;

        const items = values.map((item) => {
            const parsed = VoucherSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'schema_validation_failed',
                    message: 'Failed to parse a voucher from the API response.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        let nextCursor: string | undefined;
        if (fullResultSize !== undefined && from !== undefined && count !== undefined) {
            const nextFrom = from + count;
            if (nextFrom < fullResultSize) {
                nextCursor = String(nextFrom);
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
