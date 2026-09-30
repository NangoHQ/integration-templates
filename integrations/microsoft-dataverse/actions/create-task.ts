import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        subject: z.string().describe('Short summary of the task. Maps to the Dataverse "subject" field. Example: "Follow up on quote renewal"'),
        description: z.string().optional().describe('Detailed body of the task. Maps to the Dataverse "description" field.'),
        scheduledstart: z.string().optional().describe('Planned start of the task as an ISO 8601 UTC timestamp. Example: "2026-10-01T09:00:00Z"'),
        scheduledend: z.string().optional().describe('Due date of the task as an ISO 8601 UTC timestamp. Example: "2026-10-01T17:00:00Z"'),
        regarding: z
            .object({
                entityLogicalName: z
                    .string()
                    .describe(
                        'Logical name of the related entity, used to build the bind property "regardingobjectid_{entityLogicalName}_task". Example: "account", "contact", "incident"'
                    ),
                entitySetName: z
                    .string()
                    .describe('Entity set name of the related entity, used in the bind URL path. Example: "accounts", "contacts", "incidents"'),
                id: z.string().describe('GUID of the existing record the task is regarding. Example: "178eb237-2bbc-f111-aaad-7ced8d717fa5"')
            })
            .optional()
            .describe('Optional existing record (account, contact, opportunity, case, ...) the task is regarding. The record must already exist.')
    })
    .describe('Input for creating a Dataverse task activity.');

const OutputSchema = z
    .object({
        id: z.string().describe('GUID of the created task (Dataverse "activityid").'),
        subject: z.string().optional().describe('Short summary of the task.'),
        description: z.string().optional().describe('Detailed body of the task.'),
        scheduledstart: z.string().optional().describe('Planned start of the task as an ISO 8601 UTC timestamp.'),
        scheduledend: z.string().optional().describe('Due date of the task as an ISO 8601 UTC timestamp.'),
        statecode: z.number().optional().describe('Task state code: 0 = Open, 1 = Completed, 2 = Canceled.'),
        statuscode: z.number().optional().describe('Task status reason code reported by Dataverse.'),
        createdon: z.string().optional().describe('Creation timestamp of the task as an ISO 8601 UTC timestamp.'),
        modifiedon: z.string().optional().describe('Last-modified timestamp of the task as an ISO 8601 UTC timestamp.')
    })
    .describe('The created Dataverse task record.');

const ProviderTaskSchema = z.object({
    activityid: z.string(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    scheduledstart: z.string().nullable().optional(),
    scheduledend: z.string().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Creates a new task record in Dataverse and reads back the created record.
 * @pitfalls: Dataverse applies server-side defaults to omitted fields, so the returned task can include values not sent in the input; a task created with only scheduledend comes back with scheduledstart set to the same time. A regarding record must already exist and both its entity logical name and entity set name must be correct, otherwise the create fails.
 */
const action = createAction({
    description: 'Create a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            subject: input.subject,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.scheduledstart !== undefined && { scheduledstart: input.scheduledstart }),
            ...(input.scheduledend !== undefined && { scheduledend: input.scheduledend })
        };

        if (input.regarding) {
            data[`regardingobjectid_${input.regarding.entityLogicalName}_task@odata.bind`] = `/${input.regarding.entitySetName}(${input.regarding.id})`;
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const createResponse = await nango.post({
            endpoint: '/api/data/v9.2/tasks',
            data,
            // Task creation is not idempotent (no idempotency key): a retry after a lost response would create a duplicate task, so retries are deliberately disabled here.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const rawEntityIdHeader = createResponse.headers['odata-entityid'];
        const entityIdHeader = Array.isArray(rawEntityIdHeader) ? rawEntityIdHeader[0] : rawEntityIdHeader;
        const idMatch = typeof entityIdHeader === 'string' ? /\(([0-9a-fA-F-]{36})\)/.exec(entityIdHeader) : null;
        const taskId = idMatch?.[1];

        if (!taskId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Dataverse task creation succeeded but the OData-EntityId header with the new task id was missing.'
            });
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const taskResponse = await nango.get({
            endpoint: `/api/data/v9.2/tasks(${taskId})`,
            params: {
                $select: 'activityid,subject,description,scheduledstart,scheduledend,statecode,statuscode,createdon,modifiedon'
            },
            retries: 3
        });

        const task = ProviderTaskSchema.parse(taskResponse.data);

        return {
            id: task.activityid,
            ...(task.subject != null && { subject: task.subject }),
            ...(task.description != null && { description: task.description }),
            ...(task.scheduledstart != null && { scheduledstart: task.scheduledstart }),
            ...(task.scheduledend != null && { scheduledend: task.scheduledend }),
            ...(task.statecode != null && { statecode: task.statecode }),
            ...(task.statuscode != null && { statuscode: task.statuscode }),
            ...(task.createdon != null && { createdon: task.createdon }),
            ...(task.modifiedon != null && { modifiedon: task.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
