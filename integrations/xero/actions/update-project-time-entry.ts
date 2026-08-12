import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        timeEntryId: z.string().describe('The time entry ID to update. Example: "66d3c017-0bc1-4da2-8b62-fd585e5fec65"'),
        userId: z.string().describe('The Xero user ID of the person logging the time. Example: "aaff934e-1eea-4d1b-b1a4-5d0792c4276c"'),
        taskId: z.string().describe('The task ID that the time entry is logged against. Example: "b1acc65e-e338-4b49-979a-42a70a4b3542"'),
        dateUtc: z.string().describe('The date the time entry is logged on, in UTC ISO-8601 format. Example: "2024-01-15T09:00:00Z"'),
        duration: z.number().int().min(1).max(59940).describe('The duration in minutes to log. Must be between 1 and 59940 inclusive.'),
        description: z.string().optional().describe('An optional description of the time entry. Omitting it during update clears the value to null.')
    })
    .describe('Parameters for updating an existing Xero project time entry.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

/**
 * @tags: [write]
 * @tagReason: Updates an existing project time entry via a full-replacement PUT.
 * @pitfalls: Omitting the optional description field clears it to null. The provider returns no response body on success.
 */
const action = createAction({
    description: 'Update an existing project time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty success response indicating the time entry was updated.'),
    scopes: ['projects'],

    exec: async (nango, input): Promise<null> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const connectionConfig = connection.connection_config;
        const metadata = connection.metadata;

        let tenantId: string | undefined;
        if (typeof connectionConfig === 'object' && connectionConfig !== null) {
            const configTenantId = connectionConfig['tenant_id'];
            if (typeof configTenantId === 'string' && configTenantId.length > 0) {
                tenantId = configTenantId;
            }
        }

        if (!tenantId && typeof metadata === 'object' && metadata !== null) {
            const metaTenantId = metadata['tenantId'];
            if (typeof metaTenantId === 'string' && metaTenantId.length > 0) {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);

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

        const data: Record<string, unknown> = {
            userId: input.userId,
            taskId: input.taskId,
            dateUtc: input.dateUtc,
            duration: input.duration
        };
        if (input.description !== undefined) {
            data['description'] = input.description;
        }

        // https://developer.xero.com/documentation/api/projects/time
        await nango.put({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Time/${encodeURIComponent(input.timeEntryId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
