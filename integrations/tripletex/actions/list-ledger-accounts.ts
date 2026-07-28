import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const AccountSchema = z.object({
    id: z.number().describe('Account ID. Example: 291297167'),
    version: z.number().optional(),
    url: z.string().optional(),
    number: z.number().describe('Account number. Example: 1000'),
    numberPretty: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    ledgerType: z.string().optional(),
    balanceGroup: z.string().optional(),
    vatLocked: z.boolean().optional(),
    isCloseable: z.boolean().optional(),
    isApplicableForSupplierInvoice: z.boolean().optional(),
    requireReconciliation: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    isBankAccount: z.boolean().optional(),
    isInvoiceAccount: z.boolean().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountIBAN: z.string().optional(),
    bankAccountSWIFT: z.string().optional(),
    saftCode: z.string().optional(),
    groupingCode: z.string().optional(),
    displayName: z.string().optional(),
    requiresDepartment: z.boolean().optional(),
    requiresProject: z.boolean().optional(),
    isPostingsExist: z.boolean().optional(),
    requiresFreeDimension1: z.boolean().optional(),
    requiresFreeDimension2: z.boolean().optional(),
    requiresFreeDimension3: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(AccountSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger (chart of accounts) accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const pageSize = 100;
        const from = input.cursor ? Number(input.cursor) : 0;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/ledger/account',
            params: {
                from: String(from),
                count: String(pageSize)
            },
            retries: 3
        });

        const listResponse = z
            .object({
                fullResultSize: z.number().optional(),
                from: z.number().optional(),
                count: z.number().optional(),
                versionDigest: z.string().optional(),
                values: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const values = listResponse.values ?? [];
        const currentFrom = listResponse.from ?? from;
        const currentCount = listResponse.count ?? values.length;
        const nextFrom = currentFrom + currentCount;
        const hasMore = listResponse.fullResultSize != null ? nextFrom < listResponse.fullResultSize : values.length === pageSize;

        return {
            items: values.map((item: unknown) => AccountSchema.parse(item)),
            ...(hasMore && { nextCursor: String(nextFrom) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
