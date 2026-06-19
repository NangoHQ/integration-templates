import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the task to retrieve. Example: "4150868000002738003"')
});

const OwnerSchema = z.object({
    name: z.string().describe('Name of the user'),
    id: z.string().describe('ID of the user'),
    email: z.string().optional().describe('Email of the user')
});

const LookupSchema = z.object({
    name: z.string().describe('Name of the related record'),
    id: z.string().describe('ID of the related record')
});

const RecurringActivitySchema = z.object({
    RRULE: z.string()
});

const OwnerOutputSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    Subject: z.string().describe('Subject/title of the task'),
    Due_Date: z.string().nullable().optional().describe('Due date of the task in yyyy-MM-dd format'),
    Status: z.string().nullable().optional().describe('Status of the task (e.g., Not Started, In Progress, Completed)'),
    Priority: z.string().nullable().optional().describe('Priority of the task (e.g., Low, Medium, High)'),
    Description: z.string().nullable().optional().describe('Detailed description of the task'),
    Owner: OwnerSchema.nullable().optional(),
    Created_Time: z.string().describe('ISO timestamp when the task was created'),
    Modified_Time: z.string().describe('ISO timestamp when the task was last modified'),
    Created_By: OwnerSchema.nullable().optional(),
    Modified_By: OwnerSchema.nullable().optional(),
    $editable: z.boolean().optional(),
    $se_module: z.string().nullable().optional().describe('Module name if task is related to a module'),
    What_Id: LookupSchema.nullable().optional().describe('Related account or deal'),
    Who_Id: LookupSchema.nullable().optional().describe('Related contact or lead'),
    Remind_At: z.string().nullable().optional().describe('Reminder datetime'),
    Closed_Time: z.string().nullable().optional().describe('When the task was completed'),
    Send_Notification_Email: z.boolean().nullable().optional(),
    Recurring_Activity: RecurringActivitySchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Unique ID of the task'),
    subject: z.string().describe('Subject/title of the task'),
    dueDate: z.string().optional().describe('Due date of the task'),
    status: z.string().optional().describe('Status of the task'),
    priority: z.string().optional().describe('Priority of the task'),
    description: z.string().optional().describe('Description of the task'),
    owner: OwnerOutputSchema.optional(),
    createdTime: z.string().describe('When the task was created'),
    modifiedTime: z.string().describe('When the task was last modified'),
    createdBy: OwnerOutputSchema.optional(),
    modifiedBy: OwnerOutputSchema.optional(),
    relatedModule: z.string().optional().describe('Module the task is related to'),
    relatedAccountId: z.string().optional().describe('ID of related account/deal'),
    relatedContactId: z.string().optional().describe('ID of related contact/lead'),
    closedTime: z.string().optional().describe('When the task was completed'),
    reminder: z.string().optional().describe('Reminder datetime')
});

const action = createAction({
    description: 'Retrieve a single task from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.tasks.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `/crm/v2/Tasks/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                task_id: input.id
            });
        }

        const providerTask = ProviderTaskSchema.parse(response.data.data[0]);

        return {
            id: providerTask.id,
            subject: providerTask.Subject,
            ...(providerTask.Due_Date != null && { dueDate: providerTask.Due_Date }),
            ...(providerTask.Status != null && { status: providerTask.Status }),
            ...(providerTask.Priority != null && { priority: providerTask.Priority }),
            ...(providerTask.Description != null && { description: providerTask.Description }),
            ...(providerTask.Owner != null && {
                owner: {
                    name: providerTask.Owner.name,
                    id: providerTask.Owner.id,
                    ...(providerTask.Owner.email != null && { email: providerTask.Owner.email })
                }
            }),
            createdTime: providerTask.Created_Time,
            modifiedTime: providerTask.Modified_Time,
            ...(providerTask.Created_By != null && {
                createdBy: {
                    name: providerTask.Created_By.name,
                    id: providerTask.Created_By.id,
                    ...(providerTask.Created_By.email != null && { email: providerTask.Created_By.email })
                }
            }),
            ...(providerTask.Modified_By != null && {
                modifiedBy: {
                    name: providerTask.Modified_By.name,
                    id: providerTask.Modified_By.id,
                    ...(providerTask.Modified_By.email != null && { email: providerTask.Modified_By.email })
                }
            }),
            ...(providerTask.$se_module != null && { relatedModule: providerTask.$se_module }),
            ...(providerTask.What_Id != null && { relatedAccountId: providerTask.What_Id.id }),
            ...(providerTask.Who_Id != null && { relatedContactId: providerTask.Who_Id.id }),
            ...(providerTask.Closed_Time != null && { closedTime: providerTask.Closed_Time }),
            ...(providerTask.Remind_At != null && { reminder: providerTask.Remind_At })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
