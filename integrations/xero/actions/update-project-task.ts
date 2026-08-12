import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const AmountSchema = z.object({
    currency: z.string().describe('Currency code. Example: "USD"'),
    value: z.number().describe('Numeric value of the amount.')
});

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        taskId: z.string().describe('The Xero task ID. Example: "b1acc65e-e338-4b49-979a-42a70a4b3542"'),
        name: z.string().describe('Name of the task. Max length 100 characters.'),
        rate: z
            .object({
                currency: z.string().describe('Currency code for the task rate. Example: "USD"'),
                value: z.number().describe('Numeric rate value.')
            })
            .describe('Billing rate for the task.'),
        chargeType: z.enum(['TIME', 'FIXED', 'NON_CHARGEABLE']).describe('Charge type for the task. Allowed values: TIME, FIXED, NON_CHARGEABLE.'),
        estimateMinutes: z.number().optional().describe('Estimated time to perform the task, in minutes.')
    })
    .describe('Input for updating a project task.');

const OutputSchema = z
    .object({
        taskId: z.string().describe('Identifier of the task.'),
        projectId: z.string().describe('Identifier of the project.'),
        name: z.string().describe('Name of the task.'),
        rate: AmountSchema.describe('Billing rate for the task.'),
        chargeType: z.string().describe('Charge type for the task.'),
        status: z.string().describe('Status of the task.'),
        estimateMinutes: z.number().optional().describe('Estimated time to perform the task, in minutes.'),
        totalMinutes: z.number().optional().describe('Total minutes logged against the task.'),
        totalAmount: AmountSchema.optional().describe('Total amount for the task.'),
        minutesToBeInvoiced: z.number().optional().describe('Minutes yet to be invoiced.'),
        minutesInvoiced: z.number().optional().describe('Minutes already invoiced.'),
        nonChargeableMinutes: z.number().optional().describe('Non-chargeable minutes logged.'),
        fixedMinutes: z.number().optional().describe('Fixed minutes logged.'),
        amountToBeInvoiced: AmountSchema.optional().describe('Amount yet to be invoiced.'),
        amountInvoiced: AmountSchema.optional().describe('Amount already invoiced.')
    })
    .describe('The updated project task.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the connection to resolve the tenant ID when necessary, then writes the updated task to the Projects API.
 * @pitfalls: The API rejects updates when a task is in `INVOICED` or `LOCKED` status, and `status` is not an updatable field through this action.
 */
const action = createAction({
    description: 'Update an existing project task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigResult = z
            .object({
                tenant_id: z.string().optional()
            })
            .safeParse(connection.connection_config);

        let tenantId: string | undefined;

        if (connectionConfigResult.success && connectionConfigResult.data.tenant_id) {
            tenantId = connectionConfigResult.data.tenant_id;
        }

        if (!tenantId) {
            const metadataResult = z
                .object({
                    tenantId: z.string().optional()
                })
                .safeParse(connection.metadata);

            if (metadataResult.success && metadataResult.data.tenantId) {
                tenantId = metadataResult.data.tenantId;
            }
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            };

            const connectionsResponse = await nango.get(connectionsConfig);

            const connectionsResult = z
                .array(
                    z.object({
                        tenantId: z.string().optional()
                    })
                )
                .safeParse(connectionsResponse.data);

            if (!connectionsResult.success || connectionsResult.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsResult.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsResult.data[0];
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

        const body: Record<string, unknown> = {
            name: input.name,
            rate: input.rate,
            chargeType: input.chargeType
        };

        if (input.estimateMinutes !== undefined) {
            body['estimateMinutes'] = input.estimateMinutes;
        }

        const updateConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/tasks
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks/${encodeURIComponent(input.taskId)}`,
            data: body,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };

        const updateResponse = await nango.put(updateConfig);

        if (updateResponse.data && typeof updateResponse.data === 'object') {
            const taskResult = OutputSchema.safeParse(updateResponse.data);
            if (taskResult.success) {
                return taskResult.data;
            }
        }

        const getConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/tasks
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks/${encodeURIComponent(input.taskId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };

        const getResponse = await nango.get(getConfig);

        return OutputSchema.parse(getResponse.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
