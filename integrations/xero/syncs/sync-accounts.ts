import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string(),
    account_id: z.string(),
    code: z.union([z.string(), z.null()]),
    name: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    tax_type: z.union([z.string(), z.null()]),
    enable_payments_to_account: z.union([z.boolean(), z.null()]),
    show_in_expense_claims: z.union([z.boolean(), z.null()]),
    class: z.union([z.string(), z.null()]),
    system_account: z.union([z.string(), z.null()]),
    bank_account_number: z.union([z.string(), z.null()]),
    bank_account_type: z.union([z.string(), z.null()]),
    currency_code: z.union([z.string(), z.null()]),
    reporting_code: z.union([z.string(), z.null()]),
    reporting_code_name: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
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
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/sync-accounts'
        }
    ],
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        // Blocker: Chart of accounts is a small reference dataset.
        // Using full refresh to ensure deleted accounts are properly detected.
        await nango.trackDeletesStart('Account');

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

        let page = 1;
        let hasMore = true;

        while (hasMore) {
            // https://developer.xero.com/documentation/api/accounting/accounts
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Accounts',
                headers,
                params: { page: String(page) },
                retries: 3
            });

            const responseData = response.data;

            if (typeof responseData !== 'object' || responseData === null) {
                break;
            }

            const data: Record<string, unknown> = responseData;
            const accountsRaw = 'Accounts' in data && Array.isArray(data['Accounts']) ? data['Accounts'] : [];

            if (!Array.isArray(accountsRaw) || accountsRaw.length === 0) {
                break;
            }

            const mappedAccounts = accountsRaw
                .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
                .map((account) => {
                    const accountId = account['AccountID'];
                    const code = account['Code'];
                    const name = account['Name'];
                    const type = account['Type'];
                    const status = account['Status'];
                    const description = account['Description'];
                    const taxType = account['TaxType'];
                    const enablePayments = account['EnablePaymentsToAccount'];
                    const showInClaims = account['ShowInExpenseClaims'];
                    const classValue = account['Class'];
                    const systemAccount = account['SystemAccount'];
                    const bankAccountNumber = account['BankAccountNumber'];
                    const bankAccountType = account['BankAccountType'];
                    const currencyCode = account['CurrencyCode'];
                    const reportingCode = account['ReportingCode'];
                    const reportingCodeName = account['ReportingCodeName'];
                    const updatedAt = account['UpdatedDateUTC'];

                    return {
                        id: typeof accountId === 'string' ? accountId : '',
                        account_id: typeof accountId === 'string' ? accountId : '',
                        code: typeof code === 'string' ? code : null,
                        name: typeof name === 'string' ? name : null,
                        type: typeof type === 'string' ? type : null,
                        status: typeof status === 'string' ? status : null,
                        description: typeof description === 'string' ? description : null,
                        tax_type: typeof taxType === 'string' ? taxType : null,
                        enable_payments_to_account: typeof enablePayments === 'boolean' ? enablePayments : null,
                        show_in_expense_claims: typeof showInClaims === 'boolean' ? showInClaims : null,
                        class: typeof classValue === 'string' ? classValue : null,
                        system_account: typeof systemAccount === 'string' ? systemAccount : null,
                        bank_account_number: typeof bankAccountNumber === 'string' ? bankAccountNumber : null,
                        bank_account_type: typeof bankAccountType === 'string' ? bankAccountType : null,
                        currency_code: typeof currencyCode === 'string' ? currencyCode : null,
                        reporting_code: typeof reportingCode === 'string' ? reportingCode : null,
                        reporting_code_name: typeof reportingCodeName === 'string' ? reportingCodeName : null,
                        updated_at: typeof updatedAt === 'string' ? updatedAt : null
                    };
                })
                .filter((account) => account.id !== '');

            if (mappedAccounts.length > 0) {
                await nango.batchSave(mappedAccounts, 'Account');
            }

            // Xero returns up to 100 records per page
            if (accountsRaw.length < 100) {
                hasMore = false;
            } else {
                page += 1;
            }
        }

        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
