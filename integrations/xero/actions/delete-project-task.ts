import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID that contains the task. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        taskId: z.string().describe('The Xero project task ID to delete. Example: "c5eabdae-4b64-4174-aa62-d977506294f2"')
    })
    .describe('Input for deleting a Xero project task.');

const ConnectionSchema = z.object({
    connection_config: z
        .object({
            tenant_id: z.string().optional()
        })
        .passthrough()
        .nullish(),
    metadata: z
        .object({
            tenantId: z.string().optional()
        })
        .passthrough()
        .nullish()
});

const ConnectionsSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes the task from the Xero project.
 * @pitfalls: This is a genuine hard delete — the task is permanently removed and subsequent GET requests return 404.
 */
const action = createAction({
    description: 'Delete a project task.',
    version: '1.0.0',
    input: InputSchema,
    output: z.void().nullable().describe('No output.'),
    scopes: ['projects'],

    exec: async (nango, input) => {
        const rawConnection = await nango.getConnection();
        const connection = ConnectionSchema.parse(rawConnection);
        let tenantId = connection.connection_config?.tenant_id;
        if (!tenantId) {
            tenantId = connection.metadata?.tenantId;
        }
        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });
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
            tenantId = connections[0]?.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        await nango.delete({
            // https://developer.xero.com/documentation/api/projects/overview
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks/${encodeURIComponent(input.taskId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
