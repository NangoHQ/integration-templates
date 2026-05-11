import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page. Example: "21"'),
    limit: z.number().optional().describe('Maximum number of results per page. Max 1000. Default: 100')
});

const InvoiceSchema = z.object({
    Id: z.string(),
    DocNumber: z.string().optional().nullable(),
    TxnDate: z.string().optional().nullable(),
    TotalAmt: z.number().optional().nullable(),
    Balance: z.number().optional().nullable(),
    DueDate: z.string().optional().nullable(),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    CustomerMemo: z
        .object({
            value: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    BillEmail: z
        .object({
            Address: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    ShipAddr: z
        .object({
            Id: z.string().optional().nullable(),
            Line1: z.string().optional().nullable(),
            City: z.string().optional().nullable(),
            CountrySubDivisionCode: z.string().optional().nullable(),
            PostalCode: z.string().optional().nullable(),
            Country: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    BillAddr: z
        .object({
            Id: z.string().optional().nullable(),
            Line1: z.string().optional().nullable(),
            City: z.string().optional().nullable(),
            CountrySubDivisionCode: z.string().optional().nullable(),
            PostalCode: z.string().optional().nullable(),
            Country: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional().nullable(),
                DetailType: z.string().optional().nullable(),
                Amount: z.number().optional().nullable(),
                Description: z.string().optional().nullable(),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z
                            .object({
                                value: z.string(),
                                name: z.string().optional().nullable()
                            })
                            .optional()
                            .nullable(),
                        Qty: z.number().optional().nullable(),
                        UnitPrice: z.number().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
        )
        .optional()
        .nullable(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional()
        .nullable(),
    Status: z.string().optional().nullable()
});

const QueryResponseSchema = z.object({
    Invoice: z.array(InvoiceSchema).optional().nullable(),
    startPosition: z.number().optional().nullable(),
    maxResults: z.number().optional().nullable(),
    totalCount: z.number().optional().nullable()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const InvoiceLineSchema = z.object({
    id: z.string(),
    detail_type: z.string().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    item_id: z.string().optional(),
    item_name: z.string().optional(),
    quantity: z.number().optional(),
    unit_price: z.number().optional()
});

const InvoiceOutputSchema = z.object({
    id: z.string(),
    doc_number: z.string().optional(),
    txn_date: z.string().optional(),
    total_amount: z.number().optional(),
    balance: z.number().optional(),
    due_date: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    customer_memo: z.string().optional(),
    email: z.string().optional(),
    ship_address: z
        .object({
            id: z.string().optional(),
            line1: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postal_code: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    bill_address: z
        .object({
            id: z.string().optional(),
            line1: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postal_code: z.string().optional(),
            country: z.string().optional()
        })
        .optional(),
    lines: z.array(InvoiceLineSchema).optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(InvoiceOutputSchema),
    next_cursor: z.string().optional()
});

function mapInvoice(rawInvoice: z.infer<typeof InvoiceSchema>): z.infer<typeof InvoiceOutputSchema> {
    const mappedLines =
        rawInvoice.Line?.map((line) => {
            return {
                id: line.Id ?? '',
                detail_type: line.DetailType ?? undefined,
                amount: line.Amount ?? undefined,
                description: line.Description ?? undefined,
                item_id: line.SalesItemLineDetail?.ItemRef?.value ?? undefined,
                item_name: line.SalesItemLineDetail?.ItemRef?.name ?? undefined,
                quantity: line.SalesItemLineDetail?.Qty ?? undefined,
                unit_price: line.SalesItemLineDetail?.UnitPrice ?? undefined
            };
        }) ?? [];

    return {
        id: rawInvoice.Id,
        doc_number: rawInvoice.DocNumber ?? undefined,
        txn_date: rawInvoice.TxnDate ?? undefined,
        total_amount: rawInvoice.TotalAmt ?? undefined,
        balance: rawInvoice.Balance ?? undefined,
        due_date: rawInvoice.DueDate ?? undefined,
        customer_id: rawInvoice.CustomerRef?.value ?? undefined,
        customer_name: rawInvoice.CustomerRef?.name ?? undefined,
        customer_memo: rawInvoice.CustomerMemo?.value ?? undefined,
        email: rawInvoice.BillEmail?.Address ?? undefined,
        ship_address: rawInvoice.ShipAddr
            ? {
                  id: rawInvoice.ShipAddr.Id ?? undefined,
                  line1: rawInvoice.ShipAddr.Line1 ?? undefined,
                  city: rawInvoice.ShipAddr.City ?? undefined,
                  state: rawInvoice.ShipAddr.CountrySubDivisionCode ?? undefined,
                  postal_code: rawInvoice.ShipAddr.PostalCode ?? undefined,
                  country: rawInvoice.ShipAddr.Country ?? undefined
              }
            : undefined,
        bill_address: rawInvoice.BillAddr
            ? {
                  id: rawInvoice.BillAddr.Id ?? undefined,
                  line1: rawInvoice.BillAddr.Line1 ?? undefined,
                  city: rawInvoice.BillAddr.City ?? undefined,
                  state: rawInvoice.BillAddr.CountrySubDivisionCode ?? undefined,
                  postal_code: rawInvoice.BillAddr.PostalCode ?? undefined,
                  country: rawInvoice.BillAddr.Country ?? undefined
              }
            : undefined,
        lines: mappedLines.length > 0 ? mappedLines : undefined,
        status: rawInvoice.Status ?? undefined,
        created_at: rawInvoice.MetaData?.CreateTime ?? undefined,
        updated_at: rawInvoice.MetaData?.LastUpdatedTime ?? undefined
    };
}

const action = createAction({
    description: 'List invoices with the QuickBooks query endpoint',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-invoices',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a positive integer.' });
            }
            startPosition = n;
        }
        const maxResults = Math.min(input.limit ?? 100, 1000);
        if (maxResults < 1) {
            throw new nango.ActionError({ type: 'invalid_limit', message: 'Limit must be a positive integer.' });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query: `SELECT * FROM Invoice STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
            },
            headers: {
                'Content-Type': 'text/plain'
            },
            retries: 3
        });

        const parsedData = ProviderResponseSchema.parse(response.data);
        const invoices = parsedData.QueryResponse.Invoice ?? [];

        const items = invoices.map(mapInvoice);

        // Determine if there are more pages
        // If we got maxResults items, there might be more
        let nextCursor: string | undefined;
        if (invoices.length === maxResults) {
            nextCursor = String(startPosition + maxResults);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
