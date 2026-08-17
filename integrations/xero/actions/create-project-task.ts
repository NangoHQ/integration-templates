import { z } from 'zod';
import { createAction } from 'nango';

const RateSchema = z
    .object({
        currency: z.string().describe('Currency code for the task rate. Example: "USD"'),
        value: z.number().describe('Rate value.')
    })
    .describe('Rate for the task.');

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the project to create the task on. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        name: z.string().describe('Name of the task.'),
        chargeType: z.enum(['TIME', 'FIXED', 'NON_CHARGEABLE']).describe('Charge type for the task.'),
        rate: RateSchema.describe('Rate for the task. Required even for NON_CHARGEABLE tasks.'),
        estimateMinutes: z.number().optional().describe('Estimated minutes for the task.')
    })
    .describe('Input for creating a project task.');

const OutputSchema = z
    .object({
        taskId: z.string().describe('ID of the created task.'),
        name: z.string().describe('Name of the task.'),
        chargeType: z.string().describe('Charge type of the task.'),
        rate: RateSchema.describe('Rate of the task.'),
        status: z.string().describe('Status of the task.'),
        estimateMinutes: z.number().optional().describe('Estimated minutes for the task.'),
        projectId: z.string().describe('ID of the project the task belongs to.')
    })
    .describe('Output of creating a project task.');

/**
 * @tags: [write]
 * @tagReason: Creates a new task on a Xero project.
 * @pitfalls: A rate object is required even when chargeType is NON_CHARGEABLE.
 */
const action = createAction({
    description: 'Create a new billable/non-billable task on a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigSchema = z.object({
            tenant_id: z.string().optional()
        });
        const metadataSchema = z.object({
            tenantId: z.string().optional()
        });

        const connectionConfig = connectionConfigSchema.parse(connection.connection_config || {});
        const metadata = metadataSchema.parse(connection.metadata || {});

        let tenantId: string | undefined = connectionConfig.tenant_id;
        if (!tenantId) {
            tenantId = metadata.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArray = z.array(z.unknown()).parse(connectionsResponse.data);
            if (connectionsArray.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connectionsArray.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnectionSchema = z.object({
                tenantId: z.string()
            });
            const firstConnection = firstConnectionSchema.parse(connectionsArray[0]);
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/projects/tasks
        const response = await nango.post({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                name: input.name,
                chargeType: input.chargeType,
                rate: input.rate,
                ...(input.estimateMinutes !== undefined && { estimateMinutes: input.estimateMinutes })
            },
            retries: 3
        });

        const taskSchema = z.object({
            taskId: z.string(),
            name: z.string(),
            chargeType: z.string(),
            rate: z.object({
                currency: z.string(),
                value: z.number()
            }),
            status: z.string(),
            estimateMinutes: z.number().optional(),
            projectId: z.string().optional()
        });

        const task = taskSchema.parse(response.data);

        return {
            taskId: task.taskId,
            name: task.name,
            chargeType: task.chargeType,
            rate: task.rate,
            status: task.status,
            ...(task.estimateMinutes !== undefined && { estimateMinutes: task.estimateMinutes }),
            projectId: task.projectId || input.projectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
