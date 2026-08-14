import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const AmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    value: z.number().describe('Monetary value in the specified currency.')
});

const TaskSchema = z.object({
    taskId: z.string().describe('Unique identifier for the task. Example: "7be77337-feec-4458-bb1b-dbaa5a4aafce"'),
    projectId: z.string().describe('Identifier of the project the task belongs to. Example: "b021e7cb-1903-4292-b48b-5b27b4271e3e"'),
    name: z.string().describe('Name of the task.'),
    status: z.string().describe('Status of the task. Can be ACTIVE, INVOICED, or LOCKED.'),
    chargeType: z.string().describe('How the task is charged. Can be TIME, FIXED, or NON_CHARGEABLE.'),
    estimateMinutes: z.number().optional().describe('Estimated minutes for the task.'),
    totalMinutes: z.number().optional().describe('Total minutes logged against the task.'),
    minutesToBeInvoiced: z.number().optional().describe('Minutes not yet invoiced.'),
    minutesInvoiced: z.number().optional().describe('Minutes that have been invoiced.'),
    nonChargeableMinutes: z.number().optional().describe('Minutes logged as non-chargeable.'),
    fixedMinutes: z.number().optional().describe('Minutes logged against a fixed-charge task.'),
    rate: AmountSchema.optional().describe('Hourly rate or fixed amount for the task.'),
    totalAmount: AmountSchema.optional().describe('Total monetary amount logged against the task.'),
    amountToBeInvoiced: AmountSchema.optional().describe('Amount not yet invoiced.'),
    amountInvoiced: AmountSchema.optional().describe('Amount that has been invoiced.')
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Unique identifier of the project to list tasks for. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        page: z.number().optional().describe('Page number to retrieve. Defaults to 1.'),
        pageSize: z.number().optional().describe('Number of tasks per page. Must be between 1 and 500. Defaults to 50.'),
        taskIds: z.string().optional().describe('Comma-separated list of task IDs to filter by.'),
        chargeType: z.enum(['TIME', 'FIXED', 'NON_CHARGEABLE']).optional().describe('Filter tasks by charge type.')
    })
    .describe('Input parameters for listing project tasks.');

const OutputSchema = z
    .object({
        items: z.array(TaskSchema).describe('Tasks defined on the project.'),
        pagination: z
            .object({
                page: z.number().describe('Current page number.'),
                pageSize: z.number().describe('Number of items per page.'),
                pageCount: z.number().describe('Total number of pages.'),
                itemCount: z.number().describe('Total number of items.')
            })
            .optional()
            .describe('Pagination information for the response.')
    })
    .describe('Output containing the list of project tasks and pagination details.');

/**
 * @tags: [read]
 * @tagReason: Lists tasks defined on a project via a read-only Projects API call.
 * @pitfalls: Tasks are hard-deleted by the provider, so missing tasks in list results have no tombstone status.
 */
const action = createAction({
    description: 'List tasks defined on a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
            metadata: z.record(z.string(), z.unknown()).nullable().optional()
        });

        const parsedConnection = ConnectionSchema.parse(connection);

        let tenantId: string | undefined;

        const tenantIdFromConfig = parsedConnection.connection_config?.['tenant_id'];
        if (typeof tenantIdFromConfig === 'string' && tenantIdFromConfig.length > 0) {
            tenantId = tenantIdFromConfig;
        }

        if (!tenantId) {
            const tenantIdFromMetadata = parsedConnection.metadata?.['tenantId'];
            if (typeof tenantIdFromMetadata === 'string' && tenantIdFromMetadata.length > 0) {
                tenantId = tenantIdFromMetadata;
            }
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/guides/oauth2/tenants/
                endpoint: 'connections',
                retries: 10
            };
            const connectionsResponse = await nango.get(connectionsConfig);

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const ConnectionSchema = z.object({
                tenantId: z.string()
            });
            const firstConnection = ConnectionSchema.safeParse(rawConnections[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.taskIds !== undefined) {
            params['taskIds'] = input.taskIds;
        }
        if (input.chargeType !== undefined) {
            params['chargeType'] = input.chargeType;
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/tasks
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks`,
            headers: {
                'xero-tenant-id': tenantId
            },
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const ProviderResponseSchema = z.object({
            items: z.array(z.unknown()),
            pagination: z
                .object({
                    page: z.number(),
                    pageSize: z.number(),
                    pageCount: z.number(),
                    itemCount: z.number()
                })
                .optional()
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        const tasks = parsedResponse.items.map((item) => {
            const parsedTask = TaskSchema.parse(item);
            return parsedTask;
        });

        return {
            items: tasks,
            ...(parsedResponse.pagination !== undefined && { pagination: parsedResponse.pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
