import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The unique identifier of the personal task. Example: "1781108259800155000"')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.number().optional()
});

const ProjectSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

const ReminderSchema = z.object({
    dateTime: z.string().optional(),
    emailReminder: z.boolean().optional(),
    popupReminder: z.boolean().optional()
});

const AssigneeSchema = z.object({
    name: z.string().optional(),
    id: z.number().optional()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().optional(),
    createdAt: z.string().optional(),
    modifiedTime: z.string().optional(),
    owner: OwnerSchema.optional(),
    assignee: AssigneeSchema.nullable().optional(),
    project: ProjectSchema.optional(),
    namespaceId: z.string().optional(),
    numberOfSubtasks: z.number().optional(),
    tags: z.array(z.string()).optional(),
    followers: z.array(z.unknown()).optional(),
    attachments: z.array(z.unknown()).optional(),
    subtasks: z.array(z.unknown()).optional(),
    reminder: ReminderSchema.nullable().optional()
});

const OutputSchema = ProviderTaskSchema;

const action = createAction({
    description: 'Retrieve a single personal task from Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tasks.ALL', 'ZohoMail.tasks.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/mail/help/api/get-single-task.html
        const response = await nango.get({
            endpoint: `/api/tasks/me/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found or the API returned an empty response.',
                taskId: input.taskId
            });
        }

        const rawData = z
            .object({
                status: z.object({
                    code: z.number(),
                    description: z.string()
                }),
                data: z.object({
                    tasks: z.array(z.unknown())
                })
            })
            .parse(response.data);

        if (rawData.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: rawData.status.description,
                taskId: input.taskId,
                providerStatusCode: rawData.status.code
            });
        }

        const task = rawData.data.tasks[0];
        if (!task) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found.',
                taskId: input.taskId
            });
        }

        const providerTask = ProviderTaskSchema.parse(task);

        return {
            id: providerTask.id,
            title: providerTask.title,
            ...(providerTask.description !== undefined && { description: providerTask.description }),
            ...(providerTask.status !== undefined && { status: providerTask.status }),
            ...(providerTask.priority !== undefined && { priority: providerTask.priority }),
            ...(providerTask.dueDate !== undefined && { dueDate: providerTask.dueDate }),
            ...(providerTask.createdAt !== undefined && { createdAt: providerTask.createdAt }),
            ...(providerTask.modifiedTime !== undefined && { modifiedTime: providerTask.modifiedTime }),
            ...(providerTask.owner !== undefined && { owner: providerTask.owner }),
            ...(providerTask.assignee !== undefined && providerTask.assignee !== null && { assignee: providerTask.assignee }),
            ...(providerTask.project !== undefined && { project: providerTask.project }),
            ...(providerTask.namespaceId !== undefined && { namespaceId: providerTask.namespaceId }),
            ...(providerTask.numberOfSubtasks !== undefined && { numberOfSubtasks: providerTask.numberOfSubtasks }),
            ...(providerTask.tags !== undefined && { tags: providerTask.tags }),
            ...(providerTask.followers !== undefined && { followers: providerTask.followers }),
            ...(providerTask.attachments !== undefined && { attachments: providerTask.attachments }),
            ...(providerTask.subtasks !== undefined && { subtasks: providerTask.subtasks }),
            ...(providerTask.reminder !== undefined && providerTask.reminder !== null && { reminder: providerTask.reminder })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
