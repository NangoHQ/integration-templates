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
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BankTransaction: BankTransactionSchema
    },

    endpoints: [{ method: 'POST', path: '/syncs/bank-transactions' }],

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

        const isIncremental = checkpoint && checkpoint.updatedAfter.length > 0;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        // Use If-Modified-Since header if we have a checkpoint with a non-empty value
        if (isIncremental) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        let latestUpdatedDateUTC = checkpoint?.updatedAfter ?? '';

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        for await (const bankTransactions of nango.paginate({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers,
            params: {
                pageSize: '100',
                includeArchived: isIncremental ? 'true' : 'false'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'BankTransactions',
                offset_calculation_method: 'per-page',
                offset_start_value: 1
            },
            retries: 10
        })) {
            const mappedTransactions = z
                .array(z.record(z.string(), z.unknown()))
                .parse(bankTransactions)
                .map((transaction) => {
                    const updatedDateUTC = typeof transaction['UpdatedDateUTC'] === 'string' ? transaction['UpdatedDateUTC'] : '';

                    if (updatedDateUTC && updatedDateUTC > latestUpdatedDateUTC) {
                        latestUpdatedDateUTC = updatedDateUTC;
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

            const authorisedTransactions = mappedTransactions.filter((t) => t.status === 'AUTHORISED');
            await nango.batchSave(authorisedTransactions, 'BankTransaction');

            if (isIncremental) {
                const deletedTransactions = mappedTransactions.filter((t) => t.status === 'DELETED');
                await nango.batchDelete(deletedTransactions, 'BankTransaction');
            }
        }

        if (latestUpdatedDateUTC !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedDateUTC });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
