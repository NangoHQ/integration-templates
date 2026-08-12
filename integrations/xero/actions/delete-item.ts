import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        itemId: z.string().describe('The unique identifier of the Xero item to delete. Example: "f08f54b6-3886-4e72-b0cc-2cfe9cf68aa1"')
    })
    .describe('Input parameters for deleting a Xero item.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a Xero item. Unlike invoices or credit notes, this is a hard delete that cannot be undone.
 * @pitfalls: After deletion, the same item ID returns 404 on any subsequent GET.
 */
const action = createAction({
    description: 'Delete an item.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty result indicating the item was deleted successfully.'),
    scopes: ['accounting.invoices'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (
            connectionConfig &&
            typeof connectionConfig === 'object' &&
            'tenant_id' in connectionConfig &&
            typeof connectionConfig['tenant_id'] === 'string' &&
            connectionConfig['tenant_id'].length > 0
        ) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (
                metadata &&
                typeof metadata === 'object' &&
                'tenantId' in metadata &&
                typeof metadata['tenantId'] === 'string' &&
                metadata['tenantId'].length > 0
            ) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string()
                })
            );

            const connections = ConnectionsSchema.parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
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

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: `api.xro/2.0/Items/${encodeURIComponent(input.itemId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };

        await nango.delete(config);

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
