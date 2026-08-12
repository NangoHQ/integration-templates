import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Xero project ID. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        taskId: z.string().describe('Xero task ID. Example: "b1acc65e-e338-4b49-979a-42a70a4b3542"')
    })
    .describe('Input for retrieving a single Xero project task.');

const AmountSchema = z.object({
    currency: z.string().describe('Currency code. Example: "USD"'),
    value: z.number().describe('Monetary value.')
});

const OutputSchema = z
    .object({
        taskId: z.string().describe('Unique identifier of the task.'),
        name: z.string().describe('Name of the task.'),
        rate: AmountSchema.describe('Rate for the task.'),
        chargeType: z.string().describe('Charge type. Examples: TIME, FIXED, NON_CHARGEABLE.'),
        estimateMinutes: z.number().describe('Estimated time to perform the task, in minutes.'),
        projectId: z.string().describe('Unique identifier of the project the task belongs to.'),
        totalMinutes: z.number().describe('Total minutes logged against the task.'),
        totalAmount: AmountSchema.describe('Total monetary amount logged against the task.'),
        minutesInvoiced: z.number().describe('Minutes on this task that have already been invoiced.'),
        minutesToBeInvoiced: z.number().describe('Minutes on this task that have not yet been invoiced.'),
        nonChargeableMinutes: z.number().describe('Minutes logged against this task when chargeType is NON_CHARGEABLE.'),
        fixedMinutes: z.number().describe('Minutes logged against this task when chargeType is FIXED.'),
        amountToBeInvoiced: AmountSchema.describe('Monetary amount still to be invoiced.'),
        amountInvoiced: AmountSchema.describe('Monetary amount already invoiced.'),
        status: z.string().describe('Status of the task. Examples: ACTIVE, INVOICED, LOCKED.')
    })
    .describe('A single Xero project task.');

const ConnectionsResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown()))
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single project task from the Xero Projects API.
 * @pitfalls: Tasks hard-delete and return 404 when removed; a LOCKED status means the task is mid-transition and cannot be modified, and a FIXED task with invoiced rate becomes INVOICED and cannot be modified.
 */
const action = createAction({
    description: 'Retrieve a single project task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection && typeof connection === 'object' && !Array.isArray(connection)) {
            const connectionConfig = connection['connection_config'];
            if (
                connectionConfig &&
                typeof connectionConfig === 'object' &&
                !Array.isArray(connectionConfig) &&
                typeof connectionConfig['tenant_id'] === 'string' &&
                connectionConfig['tenant_id'].length > 0
            ) {
                tenantId = connectionConfig['tenant_id'];
            }

            if (!tenantId) {
                const metadata = connection['metadata'];
                if (
                    metadata &&
                    typeof metadata === 'object' &&
                    !Array.isArray(metadata) &&
                    typeof metadata['tenantId'] === 'string' &&
                    metadata['tenantId'].length > 0
                ) {
                    tenantId = metadata['tenantId'];
                }
            }
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/guides/oauth2/auth-flow
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse);
            if (!parsedConnections.success || parsedConnections.data.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            const connections = parsedConnections.data.data;
            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (firstConnection && typeof firstConnection['tenantId'] === 'string' && firstConnection['tenantId'].length > 0) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/projects/tasks
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Tasks/${encodeURIComponent(input.taskId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerTask = OutputSchema.safeParse(response.data);
        if (!providerTask.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse task response from Xero.',
                details: providerTask.error.issues
            });
        }

        return providerTask.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
