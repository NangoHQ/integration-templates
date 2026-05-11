import * as z from 'zod';
import { createAction } from 'nango';
import type { NangoAction } from 'nango';

// Provider docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
const InputSchema = z.object({
    cursor: z.number().optional().describe('Starting position for pagination (1-based)'),
    limit: z.number().optional().describe('Maximum number of results to return')
});

// QuickBooks Bill entity fields - using passthrough for provider fields
const BillSchema = z.object({
    Id: z.string(),
    VendorRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .passthrough()
        .optional(),
    APAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .passthrough()
        .optional(),
    TxnDate: z.string().optional(),
    DueDate: z.string().optional(),
    TotalAmt: z.number().optional(),
    Balance: z.number().optional(),
    CurrencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .passthrough()
        .optional(),
    PrivateNote: z.string().optional(),
    LinkedTxn: z.unknown().optional(),
    Line: z.unknown().optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .passthrough()
        .optional()
});

const QueryResponseSchema = z.object({
    Bill: z.array(BillSchema).optional(),
    maxResults: z.number().optional(),
    startPosition: z.number().optional(),
    totalCount: z.number().optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

type Bill = z.infer<typeof BillSchema>;

const OutputSchema = z.object({
    bills: z.array(
        z.object({
            id: z.string(),
            vendorId: z.string().optional(),
            vendorName: z.string().optional(),
            accountId: z.string().optional(),
            accountName: z.string().optional(),
            transactionDate: z.string().optional(),
            dueDate: z.string().optional(),
            totalAmount: z.number().optional(),
            balance: z.number().optional(),
            currency: z.string().optional(),
            privateNote: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
        })
    ),
    next_cursor: z.number().optional().describe('Next starting position for pagination')
});

async function getRealmId(nango: NangoAction): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId) {
        throw new nango.ActionError({
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return String(realmId);
}

function mapBill(bill: Bill) {
    return {
        id: bill.Id,
        vendorId: bill.VendorRef?.value,
        vendorName: bill.VendorRef?.name,
        accountId: bill.APAccountRef?.value,
        accountName: bill.APAccountRef?.name,
        transactionDate: bill.TxnDate,
        dueDate: bill.DueDate,
        totalAmount: bill.TotalAmt,
        balance: bill.Balance,
        currency: bill.CurrencyRef?.value,
        privateNote: bill.PrivateNote,
        createdAt: bill.MetaData?.CreateTime,
        updatedAt: bill.MetaData?.LastUpdatedTime
    };
}

export default createAction<typeof InputSchema, typeof OutputSchema>({
    description: 'List bills with the QuickBooks query endpoint',
    endpoint: {
        path: '/actions/list-bills',
        method: 'POST'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input) => {
        const realmId = await getRealmId(nango);

        const startPosition = input.cursor ?? 1;
        const maxResults = Math.min(input.limit ?? 100, 1000);
        if (maxResults < 1) {
            throw new nango.ActionError({ type: 'invalid_limit', message: 'Limit must be a positive integer.' });
        }

        // Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/query
        const query = `SELECT * FROM Bill STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/query
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: { query },
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const bills = parsed.QueryResponse.Bill ?? [];
        const totalCount = parsed.QueryResponse.totalCount ?? 0;

        // Determine next cursor
        const nextPosition = startPosition + bills.length;
        const next_cursor = nextPosition <= totalCount && bills.length >= maxResults ? nextPosition : undefined;

        return {
            bills: bills.map(mapBill),
            next_cursor
        };
    }
});
