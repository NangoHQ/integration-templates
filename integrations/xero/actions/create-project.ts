import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contactId: z.string().describe('The ID of the contact to associate with the project. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"'),
        name: z.string().describe('The name of the project. Example: "Nango Registry Test Project"'),
        estimateAmount: z.number().optional().describe('The estimated total amount for the project. Example: 1000.00'),
        deadlineUtc: z.string().optional().describe('The deadline for the project in UTC ISO 8601 format. Example: "2025-12-31T23:59:59Z"')
    })
    .describe('Input for creating a new Xero project');

const ProviderProjectSchema = z.object({
    projectId: z.string(),
    name: z.string(),
    contactId: z.string(),
    estimateAmount: z.number().optional(),
    deadlineUtc: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z
    .object({
        projectId: z.string().describe('The unique identifier of the created project. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        name: z.string().describe('The name of the created project.'),
        contactId: z.string().describe('The ID of the contact associated with the project.'),
        estimateAmount: z.number().optional().describe('The estimated total amount for the project.'),
        deadlineUtc: z.string().optional().describe('The deadline for the project in UTC ISO 8601 format.'),
        status: z.string().optional().describe('The status of the project. Examples: "INPROGRESS", "CLOSED"')
    })
    .describe('The newly created Xero project');

/**
 * @tags: [write]
 * @tagReason: Creates a new project via the Xero Projects API.
 * @pitfalls: Created projects cannot be deleted via the API; the only available removal path is transitioning the project status to CLOSED.
 */
const action = createAction({
    description: 'Create a new project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigSchema = z.object({
            tenant_id: z.string().optional()
        });
        const parsedConnectionConfig = connectionConfigSchema.parse(connection.connection_config);
        let tenantId = parsedConnectionConfig.tenant_id;

        if (!tenantId) {
            const metadataSchema = z
                .object({
                    tenantId: z.string().optional()
                })
                .nullable();
            const parsedMetadata = metadataSchema.parse(connection.metadata);
            tenantId = parsedMetadata?.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArraySchema = z.array(
                z.object({
                    tenantId: z.string()
                })
            );
            const connections = connectionsArraySchema.parse(connectionsResponse.data);

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
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/projects/overview#create-project
        const response = await nango.post({
            endpoint: 'projects.xro/2.0/Projects',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                contactId: input.contactId,
                name: input.name,
                ...(input.estimateAmount !== undefined && { estimateAmount: input.estimateAmount }),
                ...(input.deadlineUtc !== undefined && { deadlineUtc: input.deadlineUtc })
            },
            retries: 3
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            projectId: providerProject.projectId,
            name: providerProject.name,
            contactId: providerProject.contactId,
            ...(providerProject.estimateAmount !== undefined && { estimateAmount: providerProject.estimateAmount }),
            ...(providerProject.deadlineUtc !== undefined && { deadlineUtc: providerProject.deadlineUtc }),
            ...(providerProject.status !== undefined && { status: providerProject.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
