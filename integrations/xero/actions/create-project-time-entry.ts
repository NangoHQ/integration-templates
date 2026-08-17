import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The Xero project ID to log time against. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"'),
        userId: z.string().describe('The Xero user ID of the person logging time. Example: "aaff934e-1eea-4d1b-b1a4-5d0792c4276c"'),
        taskId: z.string().describe('The task ID within the project to log time against. Example: "b1acc65e-e338-4b49-979a-42a70a4b3542"'),
        dateUtc: z.string().describe('The date the time entry is logged on, in UTC ISO-8601 format. Example: "2026-08-11T12:00:00Z"'),
        duration: z.number().int().min(1).max(59940).describe('Duration of logged minutes. Must be between 1 and 59940 inclusive.'),
        description: z.string().optional().describe('Optional description of the time entry.')
    })
    .describe('Input for creating a Xero project time entry.');

const OutputSchema = z
    .object({
        timeEntryId: z.string().describe('The unique identifier of the created time entry.'),
        userId: z.string().describe('The Xero user ID of the person who logged time.'),
        projectId: z.string().describe('The project ID the time entry belongs to.'),
        taskId: z.string().describe('The task ID the time entry is logged against.'),
        dateUtc: z.string().describe('The date the time entry was logged, in UTC ISO-8601 format.'),
        dateEnteredUtc: z.string().describe('The date the time entry was created, in UTC ISO-8601 format. By default set to server time.'),
        duration: z.number().int().describe('The duration of the time entry in minutes.'),
        description: z.string().optional().describe('The description of the time entry.'),
        status: z.string().describe('The status of the time entry. Possible values: ACTIVE, LOCKED, INVOICED.')
    })
    .describe('Output of a created Xero project time entry.');

const ConnectionSchema = z.object({
    connection_config: z
        .object({
            tenant_id: z.string().optional()
        })
        .nullable()
        .optional(),
    metadata: z
        .object({
            tenantId: z.string().optional()
        })
        .nullable()
        .optional()
});

const ConnectionItemSchema = z.object({
    id: z.string().optional(),
    tenantId: z.string()
});

const TimeEntryResponseSchema = z.object({
    timeEntryId: z.string(),
    userId: z.string(),
    projectId: z.string(),
    taskId: z.string(),
    dateUtc: z.string(),
    dateEnteredUtc: z.string(),
    duration: z.number(),
    description: z.string().nullable().optional(),
    status: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new time entry in the Xero Projects API.
 * @pitfalls: A created time entry defaults to ACTIVE and cannot be updated once its status transitions to LOCKED or INVOICED; INVOICED entries cannot be deleted. Logging time against fixed-price tasks is not supported.
 */
const action = createAction({
    description: 'Log a new time entry against a project task',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const config = connection.connection_config;
            if ('tenant_id' in config && typeof config.tenant_id === 'string') {
                tenantId = config.tenant_id;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const meta = connection.metadata;
            if ('tenantId' in meta && typeof meta.tenantId === 'string') {
                tenantId = meta.tenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/auth-flow/#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(ConnectionItemSchema).parse(connectionsResponse.data);

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

        // https://developer.xero.com/documentation/api/projects/time
        const response = await nango.post({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}/Time`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                userId: input.userId,
                taskId: input.taskId,
                dateUtc: input.dateUtc,
                duration: input.duration,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const raw = TimeEntryResponseSchema.parse(response.data);

        return {
            timeEntryId: raw.timeEntryId,
            userId: raw.userId,
            projectId: raw.projectId,
            taskId: raw.taskId,
            dateUtc: raw.dateUtc,
            dateEnteredUtc: raw.dateEnteredUtc,
            duration: raw.duration,
            ...(raw.description != null && { description: raw.description }),
            status: raw.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
