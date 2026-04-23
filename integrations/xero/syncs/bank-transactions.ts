import { createSync } from 'nango';
import { z } from 'zod';

const BankTransactionSchema = z.object({
    id: z.string(),
    bankTransactionId: z.string(),
    bankAccount: z.unknown().optional(),
    type: z.string(),
    contact: z.unknown().optional(),
    date: z.string().optional(),
    status: z.string(),
    reference: z.string().optional(),
    isReconciled: z.boolean().optional(),
    lineItems: z.unknown().optional(),
    subtotal: z.number().optional(),
    totalTax: z.number().optional(),
    total: z.number().optional(),
    currencyCode: z.string().optional(),
    currencyRate: z.number().optional(),
    url: z.string().optional(),
    updatedDateUtc: z.string(),
    hasAttachments: z.boolean().optional(),
    prepaymentId: z.string().optional(),
    overpaymentId: z.string().optional()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(
        z.object({
            tenantId: z.string()
        })
    )
});

// Checkpoint uses empty string to indicate no previous checkpoint
const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const sync = createSync({
    description: 'Sync bank transactions from Xero',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BankTransaction: BankTransactionSchema
    },

    endpoints: [{ method: 'POST', path: '/syncs/sync-bank-transactions' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Resolve tenant ID
        let tenantId: string | undefined;

        // https://developer.xero.com/documentation/api/accounting/overview#multi-tenancy
        const connectionResponse = await nango.getConnection();

        // Check connection_config for tenant_id
        if (
            connectionResponse.connection_config &&
            typeof connectionResponse.connection_config === 'object' &&
            !Array.isArray(connectionResponse.connection_config)
        ) {
            const tenantIdValue = connectionResponse.connection_config['tenant_id'];
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        // Check metadata for tenantId
        if (!tenantId && connectionResponse.metadata && typeof connectionResponse.metadata === 'object' && !Array.isArray(connectionResponse.metadata)) {
            const metaTenantId = connectionResponse.metadata['tenantId'];
            if (typeof metaTenantId === 'string') {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/auth-flow/#connections
            const connections = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.parse(connections);
            const connectionsData = parsedConnections.data;

            if (connectionsData.length === 0) {
                throw new Error('No Xero tenants found for this connection.');
            }

            if (connectionsData.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = connectionsData[0];
            if (!firstConnection) {
                throw new Error('No Xero tenants found for this connection.');
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new Error('Unable to resolve Xero tenant ID.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        // Use If-Modified-Since header if we have a checkpoint with a non-empty value
        if (checkpoint && checkpoint.updatedAfter.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        let page = 1;
        let hasMore = true;
        let lastUpdatedDateUTC = checkpoint?.updatedAfter ?? '';

        while (hasMore) {
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            const response = await nango.get({
                endpoint: 'api.xro/2.0/BankTransactions',
                headers,
                params: {
                    page: String(page)
                },
                retries: 10
            });

            const bankTransactions = z.array(z.object({}).passthrough()).parse(response.data?.BankTransactions ?? []);

            if (bankTransactions.length === 0) {
                hasMore = false;
                break;
            }

            let pageLatestUpdatedDateUTC = lastUpdatedDateUTC;

            const mappedTransactions = bankTransactions.map((tx) => {
                const transaction = z.object({}).passthrough().parse(tx);
                const updatedDateUTC = typeof transaction['UpdatedDateUTC'] === 'string' ? transaction['UpdatedDateUTC'] : '';

                if (updatedDateUTC && updatedDateUTC > pageLatestUpdatedDateUTC) {
                    pageLatestUpdatedDateUTC = updatedDateUTC;
                }

                return {
                    id: String(transaction['BankTransactionID'] ?? ''),
                    bankTransactionId: String(transaction['BankTransactionID'] ?? ''),
                    bankAccount: transaction['BankAccount'],
                    type: String(transaction['Type'] ?? ''),
                    contact: transaction['Contact'],
                    date: transaction['Date'] ? String(transaction['Date']) : undefined,
                    status: String(transaction['Status'] ?? ''),
                    reference: transaction['Reference'] ? String(transaction['Reference']) : undefined,
                    isReconciled: transaction['IsReconciled'] === true,
                    lineItems: transaction['LineItems'],
                    subtotal: typeof transaction['SubTotal'] === 'number' ? transaction['SubTotal'] : undefined,
                    totalTax: typeof transaction['TotalTax'] === 'number' ? transaction['TotalTax'] : undefined,
                    total: typeof transaction['Total'] === 'number' ? transaction['Total'] : undefined,
                    currencyCode: transaction['CurrencyCode'] ? String(transaction['CurrencyCode']) : undefined,
                    currencyRate: typeof transaction['CurrencyRate'] === 'number' ? transaction['CurrencyRate'] : undefined,
                    url: transaction['Url'] ? String(transaction['Url']) : undefined,
                    updatedDateUtc: updatedDateUTC,
                    hasAttachments: transaction['HasAttachments'] === true,
                    prepaymentId: transaction['PrepaymentID'] ? String(transaction['PrepaymentID']) : undefined,
                    overpaymentId: transaction['OverpaymentID'] ? String(transaction['OverpaymentID']) : undefined
                };
            });

            await nango.batchSave(mappedTransactions, 'BankTransaction');

            if (pageLatestUpdatedDateUTC !== lastUpdatedDateUTC) {
                lastUpdatedDateUTC = pageLatestUpdatedDateUTC;
                await nango.saveCheckpoint({
                    updatedAfter: lastUpdatedDateUTC
                });
            }

            // Xero returns up to 100 records per page by default
            if (bankTransactions.length < 100) {
                hasMore = false;
            } else {
                page += 1;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
