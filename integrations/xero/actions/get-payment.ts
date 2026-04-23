import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    paymentId: z.string().describe('The Xero PaymentID to retrieve. Example: "b54e4368-91fd-4aa5-8205-fa3c16b61552"')
});

const OutputSchema = z.object({
    id: z.string(),
    payment: z.unknown()
});

const action = createAction({
    description: 'Retrieve a payment by PaymentID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve tenant ID - Priority 1: connection_config['tenant_id']
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const configTenantId = connection.connection_config?.['tenant_id'];
        if (typeof configTenantId === 'string' && configTenantId) {
            tenantId = configTenantId;
        }

        // Priority 2: metadata['tenantId']
        if (!tenantId) {
            const metadataTenantId = connection.metadata?.['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId) {
                tenantId = metadataTenantId;
            }
        }

        // Priority 3: GET connections API (only valid when exactly one tenant is returned)
        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview#get-connections
                endpoint: 'connections',
                retries: 10
            });

            if (!connectionsResponse.data || !Array.isArray(connectionsResponse.data)) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'Could not resolve tenant ID. No connections found.'
                });
            }

            if (connectionsResponse.data.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants available for this connection.'
                });
            }

            if (connectionsResponse.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsResponse.data[0];
            if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                const extractedTenantId = firstConnection['tenantId'];
                if (typeof extractedTenantId === 'string' && extractedTenantId) {
                    tenantId = extractedTenantId;
                }
            }

            if (!tenantId) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'Could not resolve tenant ID from connections response.'
                });
            }
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/payments
            endpoint: `api.xro/2.0/Payments/${input.paymentId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Payment with ID "${input.paymentId}" not found.`,
                paymentId: input.paymentId
            });
        }

        // Xero API returns { Payments: [...] } array
        const responseData = response.data;
        const paymentsArray = responseData['Payments'];
        if (!Array.isArray(paymentsArray) || paymentsArray.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Payment with ID "${input.paymentId}" not found.`,
                paymentId: input.paymentId
            });
        }

        const payment = paymentsArray[0];

        return {
            id: input.paymentId,
            payment: typeof payment === 'object' && payment !== null ? payment : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
