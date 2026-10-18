import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TaskSchema = z
    .object({
        id: z.string().describe('Unique record id, scoped to the parent task list as `${tasklistId}:${taskId}`.'),
        tasklistId: z.string().describe('Id of the task list that contains the task.'),
        taskId: z.string().describe('The task id assigned by Google Tasks, unique within its task list.'),
        title: z.string().optional().describe('Title of the task.'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        status: z.string().optional().describe('Completion status of the task: "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task in RFC 3339 format.'),
        completed: z.string().optional().describe('Completion time of the task in RFC 3339 format.'),
        deleted: z.boolean().optional().describe('True when this record is a delete tombstone for a task removed from the list.'),
        hidden: z.boolean().optional().describe('True when the task was completed at the time its task list was last cleared.'),
        parent: z.string().optional().describe('Id of the parent task when this task is a subtask.'),
        position: z.string().optional().describe('Position of the task among its siblings within the task list.'),
        updated: z.string().describe('Last modification time of the task in RFC 3339 format, used as the incremental watermark.')
    })
    .describe('A single Google Task, scoped to the task list that contains it.');

const CheckpointSchema = z
    .object({})
    .catchall(z.string())
    .describe(
        'Map of `tasklist:<task list id>` keys to the newest task `updated` timestamp seen for that list, used as `updatedMin` on the next incremental run.'
    );

const ProviderTaskListSchema = z.object({
    id: z.string()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    notes: z.string().nullish(),
    status: z.string().nullish(),
    due: z.string().nullish(),
    completed: z.string().nullish(),
    deleted: z.boolean().nullish(),
    hidden: z.boolean().nullish(),
    parent: z.string().nullish(),
    position: z.string().nullish(),
    updated: z.string()
});

const CURSOR_PREFIX = 'tasklist:';

const sync = createSync({
    description: 'Sync every task across every task list in the account, incrementally, including completed/hidden tasks and delete-tombstones.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const cursors: Record<string, string> = {};
        for (const [key, value] of Object.entries(checkpoint ?? {})) {
            if (key.startsWith(CURSOR_PREFIX)) {
                cursors[key] = value;
            }
        }

        const listConfig: ProxyConfiguration = {
            // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
            endpoint: '/tasks/v1/users/@me/lists',
            params: {
                maxResults: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                limit_name_in_request: 'maxResults',
                response_path: 'items',
                limit: 100
            },
            retries: 3
        };

        let tasklistCount = 0;

        for await (const listPage of nango.paginate(listConfig)) {
            const tasklists = z.array(ProviderTaskListSchema).parse(listPage);

            for (const tasklist of tasklists) {
                const tasklistId = tasklist.id;
                const cursorKey = CURSOR_PREFIX + tasklistId;
                const updatedMin = cursors[cursorKey];

                const tasksConfig: ProxyConfiguration = {
                    // https://developers.google.com/tasks/reference/rest/v1/tasks/list
                    endpoint: `/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks`,
                    params: {
                        showCompleted: 'true',
                        showHidden: 'true',
                        showDeleted: 'true',
                        ...(updatedMin !== undefined && { updatedMin })
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'pageToken',
                        cursor_path_in_response: 'nextPageToken',
                        limit_name_in_request: 'maxResults',
                        response_path: 'items',
                        limit: 100
                    },
                    retries: 3
                };

                let maxUpdated: string | undefined;

                for await (const taskPage of nango.paginate(tasksConfig)) {
                    const tasks = z.array(ProviderTaskSchema).parse(taskPage);

                    const records = tasks.map((task) => ({
                        id: `${tasklistId}:${task.id}`,
                        tasklistId,
                        taskId: task.id,
                        ...(task.title != null && { title: task.title }),
                        ...(task.notes != null && { notes: task.notes }),
                        ...(task.status != null && { status: task.status }),
                        ...(task.due != null && { due: task.due }),
                        ...(task.completed != null && { completed: task.completed }),
                        ...(task.deleted != null && { deleted: task.deleted }),
                        ...(task.hidden != null && { hidden: task.hidden }),
                        ...(task.parent != null && { parent: task.parent }),
                        ...(task.position != null && { position: task.position }),
                        updated: task.updated
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Task');
                    }

                    for (const task of tasks) {
                        if (maxUpdated === undefined || task.updated > maxUpdated) {
                            maxUpdated = task.updated;
                        }
                    }
                }

                if (maxUpdated !== undefined && (updatedMin === undefined || maxUpdated > updatedMin)) {
                    cursors[cursorKey] = maxUpdated;
                }

                tasklistCount += 1;
                await nango.saveCheckpoint(cursors);
            }
        }

        await nango.log(`Synced tasks for ${tasklistCount} task lists.`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
