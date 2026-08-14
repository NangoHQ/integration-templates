import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bankTransactionId: z.string().describe('The Xero BankTransactionID to delete. Example: "47d21e8e-926c-4dbf-97a8-471a56f7d392"')
    })
    .describe('Input for deleting a bank transaction.');

const ProviderBankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Status: z.string(),
    Type: z.string().optional(),
    Reference: z.string().optional(),
    Total: z.number().optional()
});

const OutputSchema = z
    .object({
        bankTransactionId: z.string().describe('The Xero BankTransactionID of the deleted transaction.'),
        status: z.string().describe('The updated status of the bank transaction, expected to be "DELETED".')
    })
    .describe('Output confirming the bank transaction deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a POST request to update the bank transaction status to DELETED, which soft-deletes the record on the provider.
 * @pitfalls: Bank transactions can be deleted directly from AUTHORISED status without an intermediate VOIDED step, the record remains gettable by ID afterward with Status "DELETED", and re-invoking this on an already-deleted transaction returns a validation error rather than a 404.
 */
const action = createAction({
    description: 'Delete a bank transaction',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.banktransactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined = undefined;

        if (
            connection &&
            typeof connection === 'object' &&
            'connection_config' in connection &&
            connection.connection_config &&
            typeof connection.connection_config === 'object'
        ) {
            const config = connection.connection_config;
            if ('tenant_id' in config && typeof config['tenant_id'] === 'string' && config['tenant_id'].length > 0) {
                tenantId = config['tenant_id'];
            }
        }

        if (
            !tenantId &&
            connection &&
            typeof connection === 'object' &&
            'metadata' in connection &&
            connection.metadata &&
            typeof connection.metadata === 'object'
        ) {
            const meta = connection.metadata;
            if ('tenantId' in meta && typeof meta['tenantId'] === 'string' && meta['tenantId'].length > 0) {
                tenantId = meta['tenantId'];
            }
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string()
                })
            );

            const parsedConnections = ConnectionsSchema.safeParse(connectionsResponse.data);
            if (!parsedConnections.success || parsedConnections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (parsedConnections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = parsedConnections.data[0];
            if (firstConnection && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const response = await nango.post({
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            endpoint: `api.xro/2.0/BankTransactions/${encodeURIComponent(input.bankTransactionId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Status: 'DELETED'
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            BankTransactions: z.array(ProviderBankTransactionSchema).optional()
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success || !parsedResponse.data.BankTransactions || parsedResponse.data.BankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Xero after deleting bank transaction.',
                response: response.data
            });
        }

        const transaction = parsedResponse.data.BankTransactions[0];
        if (!transaction) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Xero after deleting bank transaction.',
                response: response.data
            });
        }

        return {
            bankTransactionId: transaction.BankTransactionID,
            status: transaction.Status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
