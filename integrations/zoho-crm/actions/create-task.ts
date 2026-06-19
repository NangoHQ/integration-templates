import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subject: z.string().describe('Subject of the task. This is a mandatory field.'),
    description: z.string().optional().describe('Description of the task.'),
    due_date: z.string().optional().describe('Due date of the task in YYYY-MM-DD format.'),
    status: z.enum(['Not Started', 'Deferred', 'In Progress', 'Completed', 'Waiting on someone else']).optional().describe('Status of the task.'),
    priority: z.enum(['High', 'Highest', 'Low', 'Lowest', 'Normal']).optional().describe('Priority of the task. Default is High.'),
    who_id: z.string().optional().describe('ID of the contact or lead the task is related to.'),
    what_id: z.string().optional().describe('ID of the account, deal, or other module the task is related to.'),
    se_module: z
        .string()
        .optional()
        .describe('API name of the parent module when who_id and what_id are used. Required when associating with a parent record.'),
    send_notification_email: z.boolean().optional().describe('Whether to send a notification email to the task owner.')
});

const ProviderTaskSchema = z
    .object({
        id: z.string(),
        Subject: z.string().optional(),
        Description: z.string().nullable().optional(),
        Due_Date: z.string().nullable().optional(),
        Status: z.string().nullable().optional(),
        Priority: z.string().nullable().optional(),
        Who_Id: z
            .object({
                id: z.string(),
                name: z.string().optional()
            })
            .nullable()
            .optional(),
        What_Id: z
            .object({
                id: z.string(),
                name: z.string().optional()
            })
            .nullable()
            .optional(),
        Send_Notification_Email: z.boolean().nullable().optional(),
        Created_Time: z.string().optional(),
        Modified_Time: z.string().optional(),
        Owner: z
            .object({
                id: z.string(),
                name: z.string(),
                email: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: ProviderTaskSchema,
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    who_id: z.string().optional(),
    what_id: z.string().optional(),
    send_notification_email: z.boolean().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional()
});

const action = createAction({
    description: 'Create a task in Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.tasks.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.what_id !== undefined && input.se_module === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'se_module is required when what_id is provided'
            });
        }

        interface ZohoTask {
            Subject: string;
            Description?: string;
            Due_Date?: string;
            Status?: string;
            Priority?: string;
            Who_Id?: { id: string };
            What_Id?: { id: string };
            $se_module?: string;
            Send_Notification_Email?: boolean;
        }

        const taskData: ZohoTask = {
            Subject: input.subject
        };

        if (input.description !== undefined) {
            taskData.Description = input.description;
        }
        if (input.due_date !== undefined) {
            taskData.Due_Date = input.due_date;
        }
        if (input.status !== undefined) {
            taskData.Status = input.status;
        }
        if (input.priority !== undefined) {
            taskData.Priority = input.priority;
        }
        if (input.who_id !== undefined) {
            taskData.Who_Id = { id: input.who_id };
        }
        if (input.what_id !== undefined) {
            taskData.What_Id = { id: input.what_id };
        }
        if (input.se_module !== undefined) {
            taskData.$se_module = input.se_module;
        }
        if (input.send_notification_email !== undefined) {
            taskData.Send_Notification_Email = input.send_notification_email;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
        const response = await nango.post({
            endpoint: '/crm/v2/Tasks',
            data: {
                data: [taskData]
            },
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);

        const results = responseData.data;

        if (!results || results.length === 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No task data returned from Zoho CRM API'
            });
        }

        const result = results[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid result returned from Zoho CRM API'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'api_error',
                message: result.message,
                code: result.code
            });
        }

        const task = result.details;

        return {
            id: task.id,
            subject: task.Subject ?? input.subject,
            ...(task.Description != null && { description: task.Description }),
            ...(task.Due_Date != null && { due_date: task.Due_Date }),
            ...(task.Status != null && { status: task.Status }),
            ...(task.Priority != null && { priority: task.Priority }),
            ...(task.Who_Id != null && { who_id: task.Who_Id.id }),
            ...(task.What_Id != null && { what_id: task.What_Id.id }),
            ...(task.Send_Notification_Email != null && { send_notification_email: task.Send_Notification_Email }),
            ...(task.Created_Time != null && { created_time: task.Created_Time }),
            ...(task.Modified_Time != null && { modified_time: task.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
