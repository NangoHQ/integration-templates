import { z } from 'zod';
import { createAction } from 'nango';

const ContactSchema = z.object({
    ContactID: z.string().optional().describe('Unique identifier for the contact. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
    Name: z.string().optional().describe('Name of the contact.')
});

const LineItemSchema = z.object({
    Description: z.string().optional().describe('Description of the line item.'),
    Quantity: z.number().optional().describe('Quantity of the line item.'),
    UnitAmount: z.number().optional().describe('Unit amount for the line item.'),
    AccountCode: z.string().optional().describe('Account code for the line item.'),
    TaxType: z.string().optional().describe('Tax type applied to the line item.'),
    LineAmount: z.number().optional().describe('Total amount for the line item.')
});

const BankAccountSchema = z.object({
    AccountID: z.string().optional().describe('Unique identifier for the bank account. Example: "ceef66a5-a545-413b-9312-78a53caadbc4"'),
    Code: z.string().optional().describe('Account code for the bank account.'),
    Name: z.string().optional().describe('Name of the bank account.')
});

const InputSchema = z
    .object({
        BankTransactionID: z.string().describe('Unique identifier of the bank transaction to update. Example: "294437d0-0d9e-4d77-b1e3-873b715cdf69"'),
        Type: z
            .enum(['RECEIVE', 'SPEND', 'RECEIVE-OVERPAYMENT', 'SPEND-OVERPAYMENT', 'RECEIVE-PREPAYMENT', 'SPEND-PREPAYMENT', 'TRANSFER'])
            .optional()
            .describe('Type of the bank transaction.'),
        Contact: ContactSchema.optional().describe('Contact associated with the bank transaction.'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items for the bank transaction.'),
        BankAccount: BankAccountSchema.optional().describe('Bank account for the transaction.'),
        Date: z.string().optional().describe('Date of the bank transaction in YYYY-MM-DD format.'),
        Reference: z.string().optional().describe('Reference for the bank transaction.'),
        Status: z.enum(['AUTHORISED', 'DELETED']).optional().describe('Status of the bank transaction. Use DELETED to delete (soft-delete) the transaction.'),
        CurrencyCode: z.string().optional().describe('Currency code for the transaction.'),
        Url: z.string().optional().describe('URL link to the source document.')
    })
    .describe('Input for updating an existing bank transaction.');

const OutputSchema = z
    .object({
        BankTransactionID: z.string().describe('Unique identifier of the updated bank transaction.'),
        Type: z.string().optional().describe('Type of the bank transaction.'),
        Contact: ContactSchema.optional().describe('Contact associated with the bank transaction.'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items for the bank transaction.'),
        BankAccount: BankAccountSchema.optional().describe('Bank account for the transaction.'),
        Date: z.string().optional().describe('Date of the bank transaction in YYYY-MM-DD format.'),
        Reference: z.string().optional().describe('Reference for the bank transaction.'),
        Status: z.string().optional().describe('Status of the bank transaction.'),
        CurrencyCode: z.string().optional().describe('Currency code for the transaction.'),
        SubTotal: z.number().optional().describe('Subtotal amount of the transaction.'),
        TotalTax: z.number().optional().describe('Total tax amount of the transaction.'),
        Total: z.number().optional().describe('Total amount of the transaction.'),
        UpdatedDateUTC: z.string().optional().describe('UTC timestamp when the transaction was last updated.'),
        Url: z.string().optional().describe('URL link to the source document.')
    })
    .describe('Output representing the updated bank transaction.');

const BankTransactionResponseSchema = z.object({
    BankTransactionID: z.string().optional(),
    Type: z.string().optional(),
    Contact: z.unknown().optional(),
    LineItems: z.array(z.unknown()).optional(),
    BankAccount: z.unknown().optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string().optional(),
    CurrencyCode: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    Url: z.string().optional()
});

const UpdateResponseSchema = z.object({
    BankTransactions: z.array(BankTransactionResponseSchema).optional()
});

/**
 * @tags: [write]
 * @tagReason: POST to Xero Accounting API to modify an existing bank transaction.
 * @pitfalls: An update fails when the transaction's existing contact is archived unless you supply a new active Contact. Setting Status to DELETED soft-deletes the record, which remains gettable by ID. Providing LineItems replaces the entire existing line set; omitting it leaves lines unchanged.
 */
const action = createAction({
    description: 'Update an existing bank transaction.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.banktransactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = typeof connection.connection_config === 'object' && connection.connection_config !== null ? connection.connection_config : {};
        const metadata = typeof connection.metadata === 'object' && connection.metadata !== null ? connection.metadata : {};
        let tenantId = '';
        if (typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        } else if (typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
            tenantId = metadata['tenantId'];
        } else {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connectionsList = Array.isArray(connectionsResponse.data) ? connectionsResponse.data : [];
            if (connectionsList.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connectionsList.length === 1) {
                const first = connectionsList[0];
                if (first !== null && typeof first === 'object' && typeof first['tenantId'] === 'string' && first['tenantId'].length > 0) {
                    tenantId = first['tenantId'];
                }
            } else if (connectionsList.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const payload: Record<string, unknown> = {
            BankTransactionID: input.BankTransactionID
        };
        if (input['Type'] !== undefined) {
            payload['Type'] = input['Type'];
        }
        if (input['Contact'] !== undefined) {
            payload['Contact'] = input['Contact'];
        }
        if (input['LineItems'] !== undefined) {
            payload['LineItems'] = input['LineItems'];
        }
        if (input['BankAccount'] !== undefined) {
            payload['BankAccount'] = input['BankAccount'];
        }
        if (input['Date'] !== undefined) {
            payload['Date'] = input['Date'];
        }
        if (input['Reference'] !== undefined) {
            payload['Reference'] = input['Reference'];
        }
        if (input['Status'] !== undefined) {
            payload['Status'] = input['Status'];
        }
        if (input['CurrencyCode'] !== undefined) {
            payload['CurrencyCode'] = input['CurrencyCode'];
        }
        if (input['Url'] !== undefined) {
            payload['Url'] = input['Url'];
        }

        // https://developer.xero.com/documentation/api/accounting/banktransactions#post-banktransactions
        const response = await nango.post({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                BankTransactions: [payload]
            },
            retries: 3
        });

        const parsed = UpdateResponseSchema.parse(response.data);
        if (!parsed.BankTransactions || parsed.BankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned no bank transactions in the update response.'
            });
        }

        const updated = parsed.BankTransactions[0];
        if (!updated) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Xero returned an invalid bank transaction in the update response.'
            });
        }

        const contact = updated.Contact !== undefined ? ContactSchema.parse(updated.Contact) : undefined;
        const lineItems = updated.LineItems !== undefined ? updated.LineItems.map((item) => LineItemSchema.parse(item)) : undefined;
        const bankAccount = updated.BankAccount !== undefined ? BankAccountSchema.parse(updated.BankAccount) : undefined;

        const output: z.infer<typeof OutputSchema> = {
            BankTransactionID: updated.BankTransactionID || '',
            ...(updated.Type !== undefined && { Type: updated.Type }),
            ...(contact !== undefined && { Contact: contact }),
            ...(lineItems !== undefined && { LineItems: lineItems }),
            ...(bankAccount !== undefined && { BankAccount: bankAccount }),
            ...(updated.Date !== undefined && { Date: updated.Date }),
            ...(updated.Reference !== undefined && { Reference: updated.Reference }),
            ...(updated.Status !== undefined && { Status: updated.Status }),
            ...(updated.CurrencyCode !== undefined && { CurrencyCode: updated.CurrencyCode }),
            ...(updated.SubTotal !== undefined && { SubTotal: updated.SubTotal }),
            ...(updated.TotalTax !== undefined && { TotalTax: updated.TotalTax }),
            ...(updated.Total !== undefined && { Total: updated.Total }),
            ...(updated.UpdatedDateUTC !== undefined && { UpdatedDateUTC: updated.UpdatedDateUTC }),
            ...(updated.Url !== undefined && { Url: updated.Url })
        };

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
