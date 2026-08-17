import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('The Xero AccountID to delete. Example: "7813c0be-79d1-4b62-a4af-e2e8208268c6"')
    })
    .describe('Input for deleting a Xero chart of accounts entry.');

const OutputSchema = z.object({}).describe('Empty confirmation output for a successful deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes an account from the chart of accounts via HTTP DELETE.
 * @pitfalls: Unlike most Xero resources, this is a genuine hard delete with no recovery path. Accounts that have existing transactions cannot be deleted and will raise a validation error.
 */
const action = createAction({
    description: 'Delete an account from the chart of accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionSchema = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).optional(),
                metadata: z.record(z.string(), z.unknown()).nullable().optional()
            })
            .passthrough();

        const parsedConnection = connectionSchema.parse(connection);

        let tenantId: string | undefined;

        if (
            parsedConnection.connection_config &&
            typeof parsedConnection.connection_config['tenant_id'] === 'string' &&
            parsedConnection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = parsedConnection.connection_config['tenant_id'];
        } else if (parsedConnection.metadata && typeof parsedConnection.metadata['tenantId'] === 'string' && parsedConnection.metadata['tenantId'].length > 0) {
            tenantId = parsedConnection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);

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

            const firstConnection = z.record(z.string(), z.unknown()).parse(connections[0]);
            if (typeof firstConnection['tenantId'] === 'string' && firstConnection['tenantId'].length > 0) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        await nango.delete({
            endpoint: `api.xro/2.0/Accounts/${encodeURIComponent(input.account_id)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
