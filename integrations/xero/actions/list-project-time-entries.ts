import { z } from 'zod';
import { createAction } from 'nango';

const TimeEntrySchema = z.object({
    timeEntryId: z.string(),
    userId: z.string(),
    projectId: z.string(),
    taskId: z.string(),
    dateUtc: z.string(),
    dateEnteredUtc: z.string(),
    duration: z.number(),
    description: z.string().optional(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        pageCount: z.number(),
        itemCount: z.number()
    }),
    items: z.array(TimeEntrySchema)
});

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID to list time entries for. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        userId: z.string().optional().describe('Filter by the Xero user ID of the person who logged time.'),
        taskId: z.string().optional().describe('Filter by the task ID the time entry is logged against.'),
        invoiceId: z.string().optional().describe('Filter by the invoice ID to find related time entries.'),
        contactId: z.string().optional().describe('Filter by the contact ID to find related time entries.'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        pageSize: z.number().optional().describe('Number of items to return per page. Must be between 1 and 500. Defaults to 50.'),
        states: z.array(z.string()).optional().describe('Filter by time entry statuses such as ACTIVE, LOCKED, or INVOICED.'),
        isChargeable: z.boolean().optional().describe('Filter to time entries for tasks with charge type TIME or FIXED.'),
        dateAfterUtc: z.string().optional().describe('Filter to time entries on or after this UTC date (ISO 8601).'),
        dateBeforeUtc: z.string().optional().describe('Filter to time entries on or before this UTC date (ISO 8601).')
    })
    .describe('Input for listing project time entries in Xero.');

const OutputItemSchema = z.object({
    timeEntryId: z.string().describe('Unique identifier of the time entry.'),
    userId: z.string().describe('Xero user ID of the person who logged the time.'),
    projectId: z.string().describe('Xero project ID the time entry belongs to.'),
    taskId: z.string().describe('Xero task ID the time entry is logged against.'),
    dateUtc: z.string().describe('Date the time entry was logged (ISO 8601 UTC).'),
    dateEnteredUtc: z.string().describe('Date the time entry was created (ISO 8601 UTC).'),
    duration: z.number().describe('Duration of the time entry in minutes.'),
    description: z.string().optional().describe('Description of the time entry.'),
    status: z.string().describe('Status of the time entry: ACTIVE, LOCKED, or INVOICED.')
});

const OutputSchema = z
    .object({
        items: z.array(OutputItemSchema).describe('List of time entries for the project.'),
        nextPage: z.number().optional().describe('The next page number to request, if more pages are available.')
    })
    .describe('Output containing a paginated list of Xero project time entries.');

/**
 * @tags: [read]
 * @tagReason: Retrieves time entries from the Xero Projects API.
 * @pitfalls: Time entries are hard-deleted with no tombstone status; IDs returned here may later 404 and deletions cannot be detected by listing.
 */
const action = createAction({
    description: 'List time entries logged against a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects', 'projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
            const configTenantId = connection.connection_config['tenant_id'];
            if (typeof configTenantId === 'string' && configTenantId.length > 0) {
                tenantId = configTenantId;
            }
        }

        if (!tenantId) {
            if (connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
                const metadataTenantId = connection.metadata['tenantId'];
                if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                    tenantId = metadataTenantId;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnectionsData = connectionsResponse.data;
            if (!Array.isArray(rawConnectionsData) || rawConnectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = rawConnectionsData[0];
            if (
                firstConnection &&
                typeof firstConnection === 'object' &&
                'tenantId' in firstConnection &&
                typeof firstConnection['tenantId'] === 'string' &&
                firstConnection['tenantId'].length > 0
            ) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string | number | string[]> = {};

        if (input.userId !== undefined) {
            params['userId'] = input.userId;
        }
        if (input.taskId !== undefined) {
            params['taskId'] = input.taskId;
        }
        if (input.invoiceId !== undefined) {
            params['invoiceId'] = input.invoiceId;
        }
        if (input.contactId !== undefined) {
            params['contactId'] = input.contactId;
        }
        if (input.cursor !== undefined && input.cursor.length > 0) {
            const parsedPage = parseInt(input.cursor, 10);
            if (!Number.isNaN(parsedPage)) {
                params['page'] = parsedPage;
            }
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.states !== undefined && input.states.length > 0) {
            params['states'] = input.states;
        }
        if (input.isChargeable !== undefined) {
            params['isChargeable'] = String(input.isChargeable);
        }
        if (input.dateAfterUtc !== undefined) {
            params['dateAfterUtc'] = input.dateAfterUtc;
        }
        if (input.dateBeforeUtc !== undefined) {
            params['dateBeforeUtc'] = input.dateBeforeUtc;
        }

        // https://developer.xero.com/documentation/api/projects/overview
        const response = await nango.get({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Time`,
            params,
            retries: 3,
            headers: {
                'xero-tenant-id': tenantId
            }
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => ({
            timeEntryId: item.timeEntryId,
            userId: item.userId,
            projectId: item.projectId,
            taskId: item.taskId,
            dateUtc: item.dateUtc,
            dateEnteredUtc: item.dateEnteredUtc,
            duration: item.duration,
            ...(item.description !== undefined && { description: item.description }),
            status: item.status
        }));

        const nextPage = parsed.pagination.page < parsed.pagination.pageCount ? parsed.pagination.page + 1 : undefined;

        return {
            items,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
