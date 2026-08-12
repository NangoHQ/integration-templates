import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID that contains the time entry.'),
        timeEntryId: z.string().describe('The ID of the time entry to delete.')
    })
    .describe('Input to delete a specific time entry from a Xero project.');

const OutputSchema = z.null().describe('Empty response confirming deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a time entry from a Xero project.
 * @pitfalls: Time entries are hard-deleted and cannot be recovered.
 */
const action = createAction({
    description: 'Delete a project time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).nullish(),
                metadata: z.record(z.string(), z.unknown()).nullish()
            })
            .parse(await nango.getConnection());

        let tenantId: string | undefined;

        const configValue = connection.connection_config?.['tenant_id'];
        if (typeof configValue === 'string' && configValue.length > 0) {
            tenantId = configValue;
        }

        if (!tenantId) {
            const metaValue = connection.metadata?.['tenantId'];
            if (typeof metaValue === 'string' && metaValue.length > 0) {
                tenantId = metaValue;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = z
                .array(
                    z.object({
                        tenantId: z.string()
                    })
                )
                .parse(connectionsResponse.data);

            if (parsedConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            } else if (parsedConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            } else {
                const firstTenant = parsedConnections[0];
                if (firstTenant && firstTenant.tenantId.length > 0) {
                    tenantId = firstTenant.tenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/projects/overview
        await nango.delete({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Time/${encodeURIComponent(input.timeEntryId)}`,
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
