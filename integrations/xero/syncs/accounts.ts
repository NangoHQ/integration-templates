import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    code: z.union([z.string(), z.null()]),
    name: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    taxType: z.union([z.string(), z.null()]),
    enablePaymentsToAccount: z.union([z.boolean(), z.null()]),
    showInExpenseClaims: z.union([z.boolean(), z.null()]),
    class: z.union([z.string(), z.null()]),
    systemAccount: z.union([z.string(), z.null()]),
    bankAccountNumber: z.union([z.string(), z.null()]),
    bankAccountType: z.union([z.string(), z.null()]),
    currencyCode: z.union([z.string(), z.null()]),
    reportingCode: z.union([z.string(), z.null()]),
    reportingCodeName: z.union([z.string(), z.null()]),
    updatedAt: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

interface ConnectionInfo {
    connection_config?: Record<string, unknown>;
    metadata?: Record<string, unknown> | null;
}

function resolveTenantId(connection: ConnectionInfo): string {
    const config = connection.connection_config;
    if (config) {
        const tenantIdFromConfig = config['tenant_id'];
        if (typeof tenantIdFromConfig === 'string' && tenantIdFromConfig) {
            return tenantIdFromConfig;
        }
    }

    const metadata = connection.metadata;
    if (metadata) {
        const tenantIdFromMetadata = metadata['tenantId'];
        if (typeof tenantIdFromMetadata === 'string' && tenantIdFromMetadata) {
            return tenantIdFromMetadata;
        }
    }

    throw new Error('Missing tenant_id. Please configure tenant_id in connection_config or use the get-tenants action to set tenantId in metadata.');
}

async function fetchTenantIdWithRetry(
    nango: {
        get: (config: { endpoint: string; retries: number }) => Promise<{ data: { data?: Array<{ tenantId: string }> } }>;
    },
    maxRetries: number
): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // @allowTryCatch Retry logic with exponential backoff for fetching tenant ID
        try {
            // https://developer.xero.com/documentation/api/accounting/connections
            const response = await nango.get({
                endpoint: 'connections',
                retries: 3
            });

            const connections = response.data.data;
            if (!Array.isArray(connections) || connections.length === 0) {
                throw new Error('No tenants found for this connection.');
            }

            if (connections.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const tenantId = connections[0]?.tenantId;
            if (typeof tenantId === 'string' && tenantId) {
                return tenantId;
            }

            throw new Error('Invalid tenant data returned from connections endpoint.');
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    throw lastError ?? new Error('Failed to fetch tenant ID after retries.');
}

const sync = createSync({
    description: 'Sync accounts from the Xero chart of accounts.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/accounts'
        }
    ],
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const connection = await nango.getConnection();

        let tenantId: string;
        // @allowTryCatch Try connection config/metadata first, then fall back to API call
        try {
            tenantId = resolveTenantId(connection);
        } catch {
            tenantId = await fetchTenantIdWithRetry(nango, 10);
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        // If it is an incremental sync, only fetch the changed accounts
        if (checkpoint && checkpoint.updatedAfter.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Accounts',
            headers,
            retries: 10
        });

        const responseData = response.data;
        const data: Record<string, unknown> = typeof responseData === 'object' && responseData !== null ? responseData : {};
        const accountsRaw = 'Accounts' in data && Array.isArray(data['Accounts']) ? data['Accounts'] : [];

        let latestUpdatedAt = checkpoint?.updatedAfter ?? '';

        const mappedAccounts = accountsRaw
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map((account) => {
                const updatedAt = typeof account['UpdatedDateUTC'] === 'string' ? account['UpdatedDateUTC'] : null;
                if (updatedAt && updatedAt > latestUpdatedAt) {
                    latestUpdatedAt = updatedAt;
                }
                return {
                    id: typeof account['AccountID'] === 'string' ? account['AccountID'] : '',
                    accountId: typeof account['AccountID'] === 'string' ? account['AccountID'] : '',
                    code: typeof account['Code'] === 'string' ? account['Code'] : null,
                    name: typeof account['Name'] === 'string' ? account['Name'] : null,
                    type: typeof account['Type'] === 'string' ? account['Type'] : null,
                    status: typeof account['Status'] === 'string' ? account['Status'] : null,
                    description: typeof account['Description'] === 'string' ? account['Description'] : null,
                    taxType: typeof account['TaxType'] === 'string' ? account['TaxType'] : null,
                    enablePaymentsToAccount: typeof account['EnablePaymentsToAccount'] === 'boolean' ? account['EnablePaymentsToAccount'] : null,
                    showInExpenseClaims: typeof account['ShowInExpenseClaims'] === 'boolean' ? account['ShowInExpenseClaims'] : null,
                    class: typeof account['Class'] === 'string' ? account['Class'] : null,
                    systemAccount: typeof account['SystemAccount'] === 'string' ? account['SystemAccount'] : null,
                    bankAccountNumber: typeof account['BankAccountNumber'] === 'string' ? account['BankAccountNumber'] : null,
                    bankAccountType: typeof account['BankAccountType'] === 'string' ? account['BankAccountType'] : null,
                    currencyCode: typeof account['CurrencyCode'] === 'string' ? account['CurrencyCode'] : null,
                    reportingCode: typeof account['ReportingCode'] === 'string' ? account['ReportingCode'] : null,
                    reportingCodeName: typeof account['ReportingCodeName'] === 'string' ? account['ReportingCodeName'] : null,
                    updatedAt
                };
            })
            .filter((account) => account.id !== '');

        const activeAccounts = mappedAccounts.filter((a) => a.status === 'ACTIVE');
        await nango.batchSave(activeAccounts, 'Account');

        // On incremental sync, mark archived accounts as deleted
        if (checkpoint && checkpoint.updatedAfter.length > 0) {
            const archivedAccounts = mappedAccounts.filter((a) => a.status === 'ARCHIVED');
            await nango.batchDelete(archivedAccounts, 'Account');
        }

        if (latestUpdatedAt !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
