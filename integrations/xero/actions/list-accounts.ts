import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    where: z.string().optional().describe('Xero where clause to filter accounts. Example: "Status==\\"ACTIVE\\""'),
    order: z.string().optional().describe('Xero order clause to sort accounts. Example: "Name ASC"')
});

const AccountSchema = z.object({
    AccountID: z.string(),
    Code: z.union([z.string(), z.null()]),
    Name: z.union([z.string(), z.null()]),
    Status: z.union([z.string(), z.null()]),
    Type: z.union([z.string(), z.null()]),
    TaxType: z.union([z.string(), z.null()]),
    Description: z.union([z.string(), z.null()]),
    Class: z.union([z.string(), z.null()]),
    SystemAccount: z.union([z.boolean(), z.null()]),
    EnablePaymentsToAccount: z.union([z.boolean(), z.null()]),
    ShowInExpenseClaims: z.union([z.boolean(), z.null()]),
    BankAccountNumber: z.union([z.string(), z.null()]),
    BankAccountType: z.union([z.string(), z.null()]),
    CurrencyCode: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    accounts: z.array(AccountSchema)
});

const ConnectionSchema = z.array(
    z.object({
        id: z.string(),
        tenantId: z.string(),
        tenantName: z.string().optional()
    })
);

// Type guard for record-like objects
function isRecordLike(obj: unknown): obj is { [k: string]: unknown } {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

// Helper to safely get string from unknown object
function getStringProperty(obj: unknown, key: string): string | undefined {
    if (!isRecordLike(obj)) {
        return undefined;
    }
    const value = obj[key];
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
}

// Helper to safely get boolean from unknown object
function getBooleanProperty(obj: unknown, key: string): boolean | undefined {
    if (!isRecordLike(obj)) {
        return undefined;
    }
    const value = obj[key];
    if (typeof value === 'boolean') {
        return value;
    }
    return undefined;
}

// Schema for Xero API response
const XeroApiResponseSchema = z.object({
    Accounts: z.array(z.unknown())
});

// Schema for raw account from API
const RawAccountSchema = z.object({
    AccountID: z.unknown(),
    Code: z.unknown(),
    Name: z.unknown(),
    Status: z.unknown(),
    Type: z.unknown(),
    TaxType: z.unknown(),
    Description: z.unknown(),
    Class: z.unknown(),
    SystemAccount: z.unknown(),
    EnablePaymentsToAccount: z.unknown(),
    ShowInExpenseClaims: z.unknown(),
    BankAccountNumber: z.unknown(),
    BankAccountType: z.unknown(),
    CurrencyCode: z.unknown()
});

const action = createAction({
    description: 'List accounts in the Xero chart of accounts.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-accounts',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve tenant ID - priority: connection_config.tenant_id > metadata.tenantId > connections API
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        // Check connection_config for tenant_id
        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object') {
            const configValue = getStringProperty(connectionConfig, 'tenant_id');
            if (configValue) {
                tenantId = configValue;
            }
        }

        // Check metadata for tenantId
        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const metadataValue = getStringProperty(connection.metadata, 'tenantId');
            if (metadataValue) {
                tenantId = metadataValue;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse connections response'
                });
            }

            const connections = parsedConnections.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            tenantId = connections[0]!.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve Xero tenant ID'
            });
        }

        // Build query params
        const params: Record<string, string> = {};
        const whereValue = input['where'];
        const orderValue = input['order'];
        if (typeof whereValue === 'string') {
            params['where'] = whereValue;
        }
        if (typeof orderValue === 'string') {
            params['order'] = orderValue;
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Accounts',
            params: params,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        // Parse the response with Zod
        const parsedResponse = XeroApiResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API'
            });
        }

        const accountsData = parsedResponse.data.Accounts;
        const accounts: z.infer<typeof AccountSchema>[] = [];

        for (const account of accountsData) {
            const rawAccount = RawAccountSchema.safeParse(account);
            if (!rawAccount.success) {
                continue;
            }

            const raw = rawAccount.data;

            // Extract and normalize fields
            const accountID = getStringProperty(raw, 'AccountID');
            if (!accountID) {
                continue;
            }

            const normalizedData = {
                AccountID: accountID,
                Code: getStringProperty(raw, 'Code') ?? null,
                Name: getStringProperty(raw, 'Name') ?? null,
                Status: getStringProperty(raw, 'Status') ?? null,
                Type: getStringProperty(raw, 'Type') ?? null,
                TaxType: getStringProperty(raw, 'TaxType') ?? null,
                Description: getStringProperty(raw, 'Description') ?? null,
                Class: getStringProperty(raw, 'Class') ?? null,
                SystemAccount: getBooleanProperty(raw, 'SystemAccount') ?? null,
                EnablePaymentsToAccount: getBooleanProperty(raw, 'EnablePaymentsToAccount') ?? null,
                ShowInExpenseClaims: getBooleanProperty(raw, 'ShowInExpenseClaims') ?? null,
                BankAccountNumber: getStringProperty(raw, 'BankAccountNumber') ?? null,
                BankAccountType: getStringProperty(raw, 'BankAccountType') ?? null,
                CurrencyCode: getStringProperty(raw, 'CurrencyCode') ?? null
            };

            const parsed = AccountSchema.safeParse(normalizedData);

            if (parsed.success) {
                accounts.push(parsed.data);
            }
        }

        return {
            accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
