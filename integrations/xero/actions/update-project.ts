import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Unique identifier of the project to update.'),
        name: z.string().optional().describe('New name for the project.'),
        estimate: z.number().optional().describe('New estimated amount for the project.'),
        deadline: z.string().optional().describe('New deadline in UTC ISO-8601 format.'),
        status: z.enum(['INPROGRESS', 'CLOSED']).optional().describe('New status for the project. Must be INPROGRESS or CLOSED.')
    })
    .describe('Input parameters to update a Xero project.');

const OutputSchema = z
    .object({
        projectId: z.string().describe('Unique identifier of the project.'),
        name: z.string().describe('Name of the project.'),
        status: z.string().describe('Current status of the project. Valid values: INPROGRESS, CLOSED.'),
        deadlineUtc: z.string().optional().describe('Deadline for the project in UTC ISO-8601 format.'),
        contactId: z.string().optional().describe('Identifier of the contact this project was created for.')
    })
    .describe('The updated Xero project.');

/**
 * @tags: [write, destructive]
 * @tagReason: Updates existing project properties via the Xero Projects API. Setting status to CLOSED is the closest provider equivalent to deleting a project.
 * @pitfalls: Xero requires status on every update call even when only changing the name or estimate, and there is no DELETE endpoint — setting status to CLOSED is the only way to retire a project.
 */
const action = createAction({
    description: "Update a project's name, estimate, deadline, or status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        const configTenantId = connection.connection_config?.['tenant_id'];
        if (typeof configTenantId === 'string' && configTenantId.length > 0) {
            tenantId = configTenantId;
        }

        if (!tenantId) {
            const metadataTenantId = connection.metadata?.['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                tenantId = metadataTenantId;
            }
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            };
            const connectionsResponse = await nango.get(connectionsConfig);

            const ConnectionItemSchema = z.object({
                tenantId: z.string().optional()
            });

            const parsedConnections = z.array(ConnectionItemSchema).safeParse(connectionsResponse.data);

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
            if (firstConnection && typeof firstConnection.tenantId === 'string' && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        if (!input.name && input.estimate === undefined && !input.deadline && !input.status) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one of name, estimate, deadline, or status must be provided to update.'
            });
        }

        const needsPut = input.name !== undefined || input.estimate !== undefined || input.deadline !== undefined;

        let currentName: string | undefined;
        let currentStatus: string | undefined;

        if (needsPut && (input.name === undefined || input.status === undefined)) {
            const getConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/projects/overview
                endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}`,
                headers: {
                    'xero-tenant-id': tenantId
                },
                retries: 3
            };
            const projectResponse = await nango.get(getConfig);

            const ProjectSchema = z.object({
                name: z.string(),
                status: z.string()
            });

            const project = ProjectSchema.parse(projectResponse.data);
            currentName = project.name;
            currentStatus = project.status;
        }

        const name = input.name ?? currentName;
        const status = input.status ?? currentStatus;

        if (needsPut) {
            if (!name || !status) {
                throw new nango.ActionError({
                    type: 'missing_required_field',
                    message: 'name and status are required for project updates but could not be resolved.'
                });
            }

            const putConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/projects/overview
                endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}`,
                headers: {
                    'xero-tenant-id': tenantId,
                    'Content-Type': 'application/json'
                },
                data: {
                    name,
                    status,
                    ...(input.estimate !== undefined && { estimateAmount: input.estimate }),
                    ...(input.deadline !== undefined && { deadlineUtc: input.deadline })
                },
                retries: 3
            };
            await nango.put(putConfig);
        } else {
            if (!status) {
                throw new nango.ActionError({
                    type: 'missing_required_field',
                    message: 'status is required for project updates but was not provided.'
                });
            }

            const patchConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/projects/overview
                endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}`,
                headers: {
                    'xero-tenant-id': tenantId,
                    'Content-Type': 'application/json'
                },
                data: {
                    status
                },
                retries: 3
            };
            await nango.patch(patchConfig);
        }

        const refreshConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/overview
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };
        const refreshedResponse = await nango.get(refreshConfig);

        const RefreshedProjectSchema = z.object({
            projectId: z.string(),
            name: z.string(),
            status: z.string(),
            deadlineUtc: z.string().optional(),
            contactId: z.string().optional()
        });

        const project = RefreshedProjectSchema.parse(refreshedResponse.data);

        return {
            projectId: project.projectId,
            name: project.name,
            status: project.status,
            ...(project.deadlineUtc !== undefined && { deadlineUtc: project.deadlineUtc }),
            ...(project.contactId !== undefined && { contactId: project.contactId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
