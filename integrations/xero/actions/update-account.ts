import { z } from 'zod';
import { createAction } from 'nango';

const TenantIdSchema = z.string().uuid();

const InputSchema = z.object({
    account_id: z.string().uuid().describe('Unique identifier for the account. Example: "99ce6032-0678-4aa0-8148-240c75fee33a"'),
    code: z.string().optional().describe('Account code. Example: "200"'),
    name: z.string().optional().describe('Account name. Example: "Sales"'),
    type: z.string().optional().describe('Account type. Example: "EXPENSE", "REVENUE", "ASSET"'),
    description: z.string().optional().describe('Account description. Example: "Operating expenses"'),
    tax_type: z.string().optional().describe('Tax type for the account. Example: "NONE", "OUTPUT2"'),
    enable_payments_to_account: z.boolean().optional().describe('Whether payments can be made to this account'),
    show_in_expense_claims: z.boolean().optional().describe('Whether this account shows in expense claims')
});

const OutputSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    status: z.string(),
    type: z.string(),
    tax_type: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    enable_payments_to_account: z.boolean(),
    show_in_expense_claims: z.boolean()
});

interface UnknownRecord {
    [key: string]: unknown;
}

/**
 * Check if value is a record (object with string keys)
 */
function isUnknownRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Get string value from an object if the key exists and is a string
 */
function getStringProperty(obj: unknown, key: string): string | undefined {
    if (!isUnknownRecord(obj)) {
        return undefined;
    }
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
}

/**
 * Get boolean value from an object if the key exists and is a boolean
 */
function getBooleanProperty(obj: unknown, key: string): boolean | undefined {
    if (!isUnknownRecord(obj)) {
        return undefined;
    }
    const value = obj[key];
    return typeof value === 'boolean' ? value : undefined;
}

/**
 * Get property from an object if the key exists
 */
function getProperty(obj: unknown, key: string): unknown {
    if (!isUnknownRecord(obj)) {
        return undefined;
    }
    return obj[key];
}

const action = createAction({
    description: 'Update an existing account',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // Resolve tenant ID in priority order
        let tenantId: string | null = null;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const tenantIdValue = getProperty(connection.connection_config, 'tenant_id');
            if (tenantIdValue) {
                tenantId = String(tenantIdValue);
            }
        }

        if (!tenantId) {
            if (connection.metadata && typeof connection.metadata === 'object') {
                const tenantIdValue = getProperty(connection.metadata, 'tenantId');
                if (tenantIdValue) {
                    tenantId = String(tenantIdValue);
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsDataSchema = z.object({
                data: z.unknown()
            });
            const parsedConnections = connectionsDataSchema.safeParse(connectionsResponse);

            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse connections response'
                });
            }

            const rawConnectionsData = parsedConnections.data.data;
            if (!Array.isArray(rawConnectionsData)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Connections data is not an array'
                });
            }
            const connections = rawConnectionsData;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenants',
                    message: 'No Xero tenants found for this connection'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (firstConnection && typeof firstConnection === 'object' && firstConnection !== null) {
                const tenantIdValue = getProperty(firstConnection, 'tenantId');
                if (tenantIdValue) {
                    tenantId = String(tenantIdValue);
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Could not resolve Xero tenant ID'
            });
        }

        const tenantValidation = TenantIdSchema.safeParse(tenantId);
        if (!tenantValidation.success) {
            throw new nango.ActionError({
                type: 'invalid_tenant_id',
                message: 'Resolved tenant ID is not a valid UUID'
            });
        }

        const updateData: Record<string, unknown> = {
            AccountID: input.account_id
        };

        if (input.code !== undefined) {
            updateData['Code'] = input.code;
        }
        if (input.name !== undefined) {
            updateData['Name'] = input.name;
        }
        if (input.type !== undefined) {
            updateData['Type'] = input.type;
        }
        if (input.description !== undefined) {
            updateData['Description'] = input.description;
        }
        if (input.tax_type !== undefined) {
            updateData['TaxType'] = input.tax_type;
        }
        if (input.enable_payments_to_account !== undefined) {
            updateData['EnablePaymentsToAccount'] = input.enable_payments_to_account;
        }
        if (input.show_in_expense_claims !== undefined) {
            updateData['ShowInExpenseClaims'] = input.show_in_expense_claims;
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Accounts: [updateData]
            },
            retries: 3
        });

        const responseSchema = z.object({
            data: z.unknown()
        });
        const parsedResponse = responseSchema.safeParse(response);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse API response'
            });
        }

        const rawData = parsedResponse.data.data;

        if (typeof rawData !== 'object' || rawData === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response data is not an object'
            });
        }

        const accountsArray = getProperty(rawData, 'Accounts');

        if (!accountsArray || !Array.isArray(accountsArray) || accountsArray.length === 0) {
            throw new nango.ActionError({
                type: 'no_accounts_returned',
                message: 'API did not return any accounts in the response'
            });
        }

        const account = accountsArray[0];
        if (!account || typeof account !== 'object' || account === null) {
            throw new nango.ActionError({
                type: 'no_accounts_returned',
                message: 'API did not return the updated account'
            });
        }

        const accountId = getStringProperty(account, 'AccountID');
        const code = getStringProperty(account, 'Code');
        const name = getStringProperty(account, 'Name');
        const status = getStringProperty(account, 'Status');
        const type = getStringProperty(account, 'Type');

        if (!accountId || !code || !name || !status || !type) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'API returned account with missing required fields'
            });
        }

        return {
            id: accountId,
            code: code,
            name: name,
            status: status,
            type: type,
            tax_type: getStringProperty(account, 'TaxType') ?? null,
            description: getStringProperty(account, 'Description') ?? null,
            enable_payments_to_account: getBooleanProperty(account, 'EnablePaymentsToAccount') ?? false,
            show_in_expense_claims: getBooleanProperty(account, 'ShowInExpenseClaims') ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
