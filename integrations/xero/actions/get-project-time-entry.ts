import { z } from 'zod';
import { createAction, NangoAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Xero project identifier. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        timeEntryId: z.string().describe('Xero time entry identifier. Example: "66d3c017-0bc1-4da2-8b62-fd585e5fec65"')
    })
    .describe('Input parameters for retrieving a single Xero project time entry.');

const ProviderTimeEntrySchema = z.object({
    timeEntryId: z.string(),
    userId: z.string(),
    projectId: z.string(),
    taskId: z.string(),
    dateUtc: z.string(),
    dateEnteredUtc: z.string().optional(),
    duration: z.number(),
    description: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z
    .object({
        timeEntryId: z.string().describe('Identifier of the time entry.'),
        userId: z.string().describe('Identifier of the user who logged the time.'),
        projectId: z.string().describe('Identifier of the project the time entry belongs to.'),
        taskId: z.string().describe('Identifier of the task the time entry relates to.'),
        dateUtc: z.string().describe('Date of the time entry in UTC. Example: "2020-02-27T15:00:00Z"'),
        dateEnteredUtc: z.string().optional().describe('Date the time entry was created in UTC.'),
        duration: z.number().describe('Duration of the time entry in minutes.'),
        description: z.string().optional().describe('Description of the time entry.'),
        status: z.string().optional().describe('Status of the time entry. Example: "ACTIVE"')
    })
    .describe('A single time entry from the Xero Projects API.');

async function resolveTenantId(nango: NangoAction): Promise<string> {
    const connection = await nango.getConnection();

    const configTenantId = connection.connection_config?.['tenant_id'];
    if (typeof configTenantId === 'string' && configTenantId.length > 0) {
        return configTenantId;
    }

    const metadataTenantId = connection.metadata?.['tenantId'];
    if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
        return metadataTenantId;
    }

    // https://developer.xero.com/documentation/guides/oauth2/tenants/
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsedConnections = z.array(z.record(z.string(), z.unknown())).safeParse(response.data);
    if (!parsedConnections.success || parsedConnections.data.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    const connections = parsedConnections.data;
    if (connections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connections[0];
    if (
        typeof firstConnection !== 'object' ||
        firstConnection === null ||
        typeof firstConnection['tenantId'] !== 'string' ||
        firstConnection['tenantId'].length === 0
    ) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'Unable to resolve xero-tenant-id.'
        });
    }

    return firstConnection['tenantId'];
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single time entry from the Xero Projects API.
 */
const action = createAction({
    description: 'Retrieve a single time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/projects/time
        const response = await nango.get({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Time/${encodeURIComponent(input.timeEntryId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerTimeEntry = ProviderTimeEntrySchema.parse(response.data);

        return {
            timeEntryId: providerTimeEntry.timeEntryId,
            userId: providerTimeEntry.userId,
            projectId: providerTimeEntry.projectId,
            taskId: providerTimeEntry.taskId,
            dateUtc: providerTimeEntry.dateUtc,
            ...(providerTimeEntry.dateEnteredUtc !== undefined && { dateEnteredUtc: providerTimeEntry.dateEnteredUtc }),
            duration: providerTimeEntry.duration,
            ...(providerTimeEntry.description !== undefined && { description: providerTimeEntry.description }),
            ...(providerTimeEntry.status !== undefined && { status: providerTimeEntry.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
