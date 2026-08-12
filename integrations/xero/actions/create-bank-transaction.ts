import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().describe('Quantity. Example: 1'),
    unit_amount: z.number().describe('Unit price. Example: 50.00'),
    account_code: z.string().describe('Chart of accounts code. Example: "400"'),
    tax_type: z.string().optional().describe('Tax type. Example: "NONE"')
});

const InputSchema = z
    .object({
        type: z
            .enum(['SPEND', 'RECEIVE', 'SPEND-OVERPAYMENT', 'RECEIVE-OVERPAYMENT', 'SPEND-PREPAYMENT', 'RECEIVE-PREPAYMENT'])
            .describe('Transaction type. Example: "SPEND"'),
        contact_id: z.string().describe('Xero Contact ID. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        bank_account_id: z
            .string()
            .optional()
            .describe(
                'Xero Bank Account ID (must be a Type=BANK account). Provide either bank_account_id or bank_account_code. Example: "ceef66a5-a545-413b-9312-78a53caadbc4"'
            ),
        bank_account_code: z
            .string()
            .optional()
            .describe('Xero Bank Account code (must be a Type=BANK account). Provide either bank_account_id or bank_account_code. Example: "088"'),
        date: z.string().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
        reference: z.string().optional().describe('Optional reference text. Example: "REF-001"'),
        line_items: z.array(LineItemInputSchema).describe('Line items for the transaction')
    })
    .describe('Input for creating a Xero bank transaction.')
    .refine((data) => Boolean(data.bank_account_id) !== Boolean(data.bank_account_code), {
        message: 'Provide exactly one of bank_account_id or bank_account_code.'
    });

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderBankAccountSchema = z.object({
    AccountID: z.string().optional(),
    Name: z.string().optional(),
    Code: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    LineAmount: z.number().optional()
});

const ProviderBankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    BankAccount: ProviderBankAccountSchema.optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    LineItems: z.array(ProviderLineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    BankTransactions: z.array(ProviderBankTransactionSchema).optional(),
    Status: z.string().optional()
});

const LineItemOutputSchema = z.object({
    description: z.string().optional().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().optional().describe('Quantity. Example: 1'),
    unit_amount: z.number().optional().describe('Unit price. Example: 50.00'),
    account_code: z.string().optional().describe('Chart of accounts code. Example: "400"'),
    tax_type: z.string().optional().describe('Tax type. Example: "NONE"'),
    line_amount: z.number().optional().describe('Calculated line amount. Example: 50.00')
});

const OutputSchema = z
    .object({
        bank_transaction_id: z.string().describe('Unique Xero identifier for the bank transaction. Example: "294437d0-0d9e-4d77-b1e3-873b715cdf69"'),
        type: z.string().optional().describe('Transaction type. Example: "SPEND"'),
        status: z.string().optional().describe('Transaction status. Defaults to AUTHORISED. Example: "AUTHORISED"'),
        contact_id: z.string().optional().describe('Contact ID. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        contact_name: z.string().optional().describe('Contact name. Example: "Nango Registry Test Contact 1"'),
        bank_account_id: z.string().optional().describe('Bank account ID. Example: "ceef66a5-a545-413b-9312-78a53caadbc4"'),
        bank_account_code: z.string().optional().describe('Bank account code. Example: "088"'),
        bank_account_name: z.string().optional().describe('Bank account name. Example: "Checking Account"'),
        date: z.string().optional().describe('Transaction date. Example: "2024-01-15"'),
        reference: z.string().optional().describe('Reference text. Example: "REF-001"'),
        line_items: z.array(LineItemOutputSchema).optional().describe('Line items for the transaction'),
        sub_total: z.number().optional().describe('Subtotal before tax. Example: 50.00'),
        total_tax: z.number().optional().describe('Total tax amount. Example: 0.00'),
        total: z.number().optional().describe('Total amount including tax. Example: 50.00')
    })
    .describe('Output of a created Xero bank transaction.');

/**
 * @tags: [write]
 * @tagReason: Creates a new bank transaction in Xero.
 * @pitfalls: Bank account must have Type=BANK or the call fails; omitting tax_type applies a system default tax and treats unit_amount as tax-inclusive, lowering the subtotal below what was supplied; archived contacts are rejected.
 */
const action = createAction({
    description: 'Create a spend or receive money bank transaction.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.banktransactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        async function resolveTenantId(): Promise<string> {
            const connection = await nango.getConnection();

            const connectionConfigSchema = z.object({
                tenant_id: z.string().optional()
            });
            const connectionConfigResult = connectionConfigSchema.safeParse(connection.connection_config);
            if (connectionConfigResult.success && connectionConfigResult.data.tenant_id) {
                return connectionConfigResult.data.tenant_id;
            }

            const metadataSchema = z.object({
                tenantId: z.string().optional()
            });
            const metadataResult = metadataSchema.safeParse(connection.metadata);
            if (metadataResult.success && metadataResult.data.tenantId) {
                return metadataResult.data.tenantId;
            }

            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArraySchema = z.array(z.unknown());
            const connectionsResult = connectionsArraySchema.safeParse(connectionsResponse.data);
            if (!connectionsResult.success) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            const connections = connectionsResult.data;
            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnectionSchema = z.object({
                tenantId: z.string()
            });
            const firstConnectionResult = firstConnectionSchema.safeParse(connections[0]);
            if (!firstConnectionResult.success || firstConnectionResult.data.tenantId.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Unable to resolve xero-tenant-id.'
                });
            }

            return firstConnectionResult.data.tenantId;
        }

        const tenantId = await resolveTenantId();

        const lineItems = input.line_items.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unit_amount,
            AccountCode: item.account_code,
            ...(item.tax_type !== undefined && { TaxType: item.tax_type })
        }));

        const bankAccount: Record<string, string> = {};
        if (input.bank_account_id !== undefined) {
            bankAccount['AccountID'] = input.bank_account_id;
        }
        if (input.bank_account_code !== undefined) {
            bankAccount['Code'] = input.bank_account_code;
        }

        const payload = {
            BankTransactions: [
                {
                    Type: input.type,
                    Contact: {
                        ContactID: input.contact_id
                    },
                    BankAccount: bankAccount,
                    Date: input.date,
                    LineItems: lineItems,
                    ...(input.reference !== undefined && { Reference: input.reference })
                }
            ]
        };

        const response = await nango.put({
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: payload,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Xero BankTransactions endpoint.'
            });
        }

        const bankTransactions = parsedResponse.data.BankTransactions;
        if (!bankTransactions || bankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'missing_transaction',
                message: 'No bank transaction returned in the response.'
            });
        }

        const tx = bankTransactions[0];
        if (!tx) {
            throw new nango.ActionError({
                type: 'missing_transaction',
                message: 'No bank transaction returned in the response.'
            });
        }

        if (!tx.BankTransactionID) {
            throw new nango.ActionError({
                type: 'missing_transaction',
                message: 'Created bank transaction is missing an ID.'
            });
        }

        return {
            bank_transaction_id: tx.BankTransactionID,
            ...(tx.Type !== undefined && { type: tx.Type }),
            ...(tx.Status !== undefined && { status: tx.Status }),
            ...(tx.Contact?.ContactID !== undefined && { contact_id: tx.Contact.ContactID }),
            ...(tx.Contact?.Name !== undefined && { contact_name: tx.Contact.Name }),
            ...(tx.BankAccount?.AccountID !== undefined && { bank_account_id: tx.BankAccount.AccountID }),
            ...(tx.BankAccount?.Code !== undefined && { bank_account_code: tx.BankAccount.Code }),
            ...(tx.BankAccount?.Name !== undefined && { bank_account_name: tx.BankAccount.Name }),
            ...(tx.Date !== undefined && { date: tx.Date }),
            ...(tx.Reference !== undefined && { reference: tx.Reference }),
            ...(tx.LineItems !== undefined && {
                line_items: tx.LineItems.map((item) => ({
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unit_amount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { account_code: item.AccountCode }),
                    ...(item.TaxType !== undefined && { tax_type: item.TaxType }),
                    ...(item.LineAmount !== undefined && { line_amount: item.LineAmount })
                }))
            }),
            ...(tx.SubTotal !== undefined && { sub_total: tx.SubTotal }),
            ...(tx.TotalTax !== undefined && { total_tax: tx.TotalTax }),
            ...(tx.Total !== undefined && { total: tx.Total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
