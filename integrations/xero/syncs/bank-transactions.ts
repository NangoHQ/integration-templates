import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

const BankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Status: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Type: z.string().optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    Contact: z.record(z.string(), z.unknown()).optional(),
    LineItems: z.array(z.unknown()).optional(),
    BankAccount: z.record(z.string(), z.unknown()).optional()
});

function parseXeroDate(value: string): Date | null {
    const match = value.match(/^\/Date\((\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

const sync = createSync({
    description: 'Sync bank transactions from Xero.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/bank-transactions',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        BankTransaction: z.object({
            id: z.string(),
            status: z.string().optional(),
            updatedDateUTC: z.string().optional(),
            type: z.string().optional(),
            reference: z.string().optional(),
            isReconciled: z.boolean().optional(),
            contactId: z.string().optional(),
            contactName: z.string().optional(),
            lineItemCount: z.number().optional(),
            bankAccountCode: z.string().optional(),
            bankAccountName: z.string().optional()
        })
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const checkpointData = checkpoint == null ? { updated_after: '' } : checkpoint;
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointData);
        if (!parsedCheckpoint.success) {
            throw new Error('Invalid checkpoint: ' + JSON.stringify(parsedCheckpoint.error.issues));
        }

        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.safeParse(connection);
        if (!parsedConnection.success) {
            throw new Error('Invalid connection: ' + JSON.stringify(parsedConnection.error.issues));
        }

        let tenantId: string | undefined;

        const connectionConfig = parsedConnection.data.connection_config;
        if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string') {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = parsedConnection.data.metadata;
            if (metadata && typeof metadata['tenantId'] === 'string') {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!parsedConnections.success) {
                throw new Error('Invalid connections response: ' + JSON.stringify(parsedConnections.error.issues));
            }

            const connections = parsedConnections.data;
            if (!connections || connections.length === 0) {
                throw new Error('No tenants found for this connection.');
            }
            if (connections.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstTenant = connections[0];
            if (!firstTenant) {
                throw new Error('No tenants found for this connection.');
            }

            tenantId = firstTenant.tenantId;
        }

        if (!tenantId) {
            throw new Error('Unable to resolve xero-tenant-id.');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {};

        if (parsedCheckpoint.data.updated_after.length > 0) {
            headers['If-Modified-Since'] = parsedCheckpoint.data.updated_after;
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            endpoint: 'api.xro/2.0/BankTransactions',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'BankTransactions',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(BankTransactionSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error('Invalid bank transactions page: ' + JSON.stringify(parsedPage.error.issues));
            }

            const transactions = parsedPage.data;

            const mapped = transactions.map((tx) => {
                const contact = tx.Contact || {};
                const bankAccount = tx.BankAccount || {};
                const lineItems = tx.LineItems || [];

                return {
                    id: tx.BankTransactionID,
                    status: tx.Status,
                    updatedDateUTC: tx.UpdatedDateUTC,
                    type: tx.Type,
                    reference: tx.Reference,
                    isReconciled: tx.IsReconciled,
                    contactId: typeof contact['ContactID'] === 'string' ? contact['ContactID'] : undefined,
                    contactName: typeof contact['Name'] === 'string' ? contact['Name'] : undefined,
                    lineItemCount: Array.isArray(lineItems) ? lineItems.length : undefined,
                    bankAccountCode: typeof bankAccount['Code'] === 'string' ? bankAccount['Code'] : undefined,
                    bankAccountName: typeof bankAccount['Name'] === 'string' ? bankAccount['Name'] : undefined
                };
            });

            const activeRecords = mapped.filter((tx) => tx.status !== 'DELETED');
            const deletedRecords = mapped.filter((tx) => tx.status === 'DELETED');

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'BankTransaction');
            }

            if (parsedCheckpoint.data.updated_after.length > 0 && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'BankTransaction');
            }

            let latestUpdatedDate: Date | null = null;

            for (const transaction of transactions) {
                if (typeof transaction.UpdatedDateUTC !== 'string' || transaction.UpdatedDateUTC.length === 0) {
                    continue;
                }

                const parsedUpdatedDate = parseXeroDate(transaction.UpdatedDateUTC);
                if (parsedUpdatedDate && (!latestUpdatedDate || parsedUpdatedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedUpdatedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({ updated_after: formatIfModifiedSince(latestUpdatedDate) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
