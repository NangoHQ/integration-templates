import { z } from 'zod';
import { createAction } from 'nango';

const AccountRefSchema = z.object({
    value: z.string().describe('Account ID. Example: "35"'),
    name: z.string().optional().describe('Account name. Example: "Checking"')
});

const LineLinkedTxnSchema = z.object({
    TxnId: z.string().describe('Transaction ID of the linked transaction. Example: "123"'),
    TxnType: z.string().describe('Transaction type. Example: "Payment", "Invoice"')
});

const DepositLineDetailSchema = z.object({
    AccountRef: AccountRefSchema.optional().describe('Account reference for the deposit line'),
    Entity: z
        .object({
            Type: z.string().optional(),
            EntityRef: AccountRefSchema.optional()
        })
        .optional(),
    ClassRef: AccountRefSchema.optional(),
    DepartmentRef: AccountRefSchema.optional(),
    PaymentMethodRef: AccountRefSchema.optional(),
    CheckNum: z.string().optional(),
    TxnOrigin: z.string().optional(),
    LinkedTxn: z.array(LineLinkedTxnSchema).optional()
});

const DepositLineSchema = z.object({
    Id: z.string().optional().describe('Unique identifier for the line. Example: "1"'),
    LineNum: z.number().optional(),
    Description: z.string().optional().describe('Description of the deposit line'),
    Amount: z.number().describe('Amount for this deposit line. Example: 100.00'),
    DetailType: z.enum(['DepositLineDetail', 'SalesItemLineDetail', 'AccountBasedExpenseLineDetail', 'JournalEntryLineDetail']).describe('Type of line detail'),
    DepositLineDetail: DepositLineDetailSchema.optional(),
    SalesItemLineDetail: z.unknown().optional(),
    AccountBasedExpenseLineDetail: z.unknown().optional(),
    JournalEntryLineDetail: z.unknown().optional()
});

const CurrencyRefSchema = z.object({
    value: z.string().describe('Currency code. Example: "USD"'),
    name: z.string().optional().describe('Currency name. Example: "United States Dollar"')
});

const InputSchema = z.object({
    DepositToAccountRef: AccountRefSchema.describe('Reference to the account where funds are deposited'),
    TxnDate: z.string().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    Lines: z.array(DepositLineSchema).min(1).describe('Array of deposit lines (minimum 1 required)'),
    CurrencyRef: CurrencyRefSchema.optional().describe('Currency reference'),
    PrivateNote: z.string().optional().describe('Private note for internal use')
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderDepositSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    MetaData: MetaDataSchema,
    DepositToAccountRef: AccountRefSchema,
    TxnDate: z.string(),
    TotalAmt: z.number(),
    Line: z.array(z.unknown()),
    CurrencyRef: CurrencyRefSchema.optional(),
    PrivateNote: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Deposit ID'),
    syncToken: z.string().describe('Sync token for subsequent updates'),
    createdAt: z.string().describe('Creation timestamp'),
    updatedAt: z.string().describe('Last update timestamp'),
    depositToAccountId: z.string().describe('ID of the deposit account'),
    depositToAccountName: z.string().optional().describe('Name of the deposit account'),
    txnDate: z.string().describe('Transaction date'),
    totalAmount: z.number().describe('Total deposit amount'),
    lines: z.array(z.unknown()).describe('Deposit lines'),
    currency: z.string().optional().describe('Currency code'),
    privateNote: z.string().optional().describe('Private note')
});

const action = createAction({
    description: 'Create a bank deposit transaction',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const payload = {
            DepositToAccountRef: input.DepositToAccountRef,
            TxnDate: input.TxnDate,
            Line: input.Lines,
            ...(input.CurrencyRef && { CurrencyRef: input.CurrencyRef }),
            ...(input.PrivateNote && { PrivateNote: input.PrivateNote })
        };

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/deposit
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/deposit`,
            data: payload,
            retries: 3,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create deposit: empty response from QuickBooks API'
            });
        }

        const deposit = ProviderDepositSchema.parse(response.data.Deposit);

        return {
            id: deposit.Id,
            syncToken: deposit.SyncToken,
            createdAt: deposit.MetaData.CreateTime,
            updatedAt: deposit.MetaData.LastUpdatedTime,
            depositToAccountId: deposit.DepositToAccountRef.value,
            depositToAccountName: deposit.DepositToAccountRef.name,
            txnDate: deposit.TxnDate,
            totalAmount: deposit.TotalAmt,
            lines: deposit.Line,
            currency: deposit.CurrencyRef?.value,
            privateNote: deposit.PrivateNote
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
