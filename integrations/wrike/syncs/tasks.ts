import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const EPOCH = '1970-01-01T00:00:00Z';

const REQUESTED_FIELDS = ['subTaskIds', 'superTaskIds', 'dependencyIds', 'customFields', 'parentIds', 'responsibleIds', 'authorIds'];

const CustomFieldSchema = z.object({
    id: z.string().describe('ID of the custom field definition.'),
    value: z.string().describe('Value of the custom field set on this task.')
});

const TaskDatesSchema = z.object({
    type: z.string().optional().describe('Task scheduling type: Planned, Backlog, or Milestone.'),
    duration: z.number().optional().describe('Duration in minutes for Planned tasks (one Wrike day equals 480 minutes).'),
    start: z.string().optional().describe('Start date in yyyy-MM-ddTHH:mm:ss format for Planned tasks.'),
    due: z.string().optional().describe('Due date in yyyy-MM-ddTHH:mm:ss format for Planned and Milestone tasks.'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends are included in task scheduling.')
});

const TaskSchema = z
    .object({
        id: z.string().describe('Unique Wrike task ID (opaque base64-like string).'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the task.'),
        title: z.string().optional().describe('Title of the task.'),
        status: z.string().optional().describe('Task status: Active, Deferred, Completed, or Cancelled.'),
        importance: z.string().optional().describe('Task importance: High, Low, or Normal.'),
        createdDate: z.string().optional().describe('Date the task was created (ISO 8601 UTC).'),
        updatedDate: z.string().optional().describe('Date the task was last updated (ISO 8601 UTC), used for incremental sync.'),
        completedDate: z.string().optional().describe('Date the task was completed (ISO 8601 UTC), present only for completed tasks.'),
        scope: z.string().optional().describe('Tree scope of the task: WsTask for active tasks, RbTask for trashed tasks.'),
        customStatusId: z.string().optional().describe('ID of the custom workflow status assigned to the task.'),
        permalink: z.string().optional().describe('URL to open the task in the Wrike web workspace.'),
        priority: z.string().optional().describe('Ordering key that defines the task position within a task list.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the parent folders or projects that contain the task.'),
        superTaskIds: z.array(z.string()).optional().describe('IDs of the tasks this task is a subtask of.'),
        subTaskIds: z.array(z.string()).optional().describe('IDs of the direct subtasks of this task.'),
        dependencyIds: z.array(z.string()).optional().describe('IDs of the task dependencies linked to this task.'),
        responsibleIds: z.array(z.string()).optional().describe('IDs of the users assigned to the task.'),
        authorIds: z.array(z.string()).optional().describe('IDs of the users who authored the task.'),
        customFields: z.array(CustomFieldSchema).optional().describe('Custom field values set on the task.'),
        dates: TaskDatesSchema.optional().describe('Task scheduling dates.')
    })
    .describe('A Wrike task, including its folder relationships, subtask/supertask and dependency links, and custom field values.');

const TasksResponseSchema = z.object({
    kind: z.string().optional(),
    nextPageToken: z.string().optional(),
    responseSize: z.number().optional(),
    data: z.array(TaskSchema)
});

const AccountResponseSchema = z.object({
    data: z.array(z.object({ recycleBinId: z.string() }))
});

const DeletedTaskSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string().describe('Start of the next incremental updatedDate window; EPOCH on the initial full scan.'),
    window_started_at: z.string().describe('Timestamp when the current scan window began; becomes the next updated_after once the scan completes.'),
    next_page_token: z.string().describe('Wrike nextPageToken for resuming an in-progress scan; empty when the scan is complete.')
});

const sync = createSync({
    description: 'Sync every active (non-trashed) task in the account, including subtask/supertask/dependency relationships and custom field values, and remove tasks moved to the Recycle Bin.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const now = new Date().toISOString();

        const savedPageToken = checkpoint?.next_page_token;
        let nextPageToken: string | undefined = savedPageToken !== undefined && savedPageToken !== '' ? savedPageToken : undefined;

        const filterStart = checkpoint?.updated_after !== undefined && checkpoint.updated_after !== '' ? checkpoint.updated_after : EPOCH;
        const windowStartedAt = nextPageToken !== undefined ? (checkpoint?.window_started_at ?? now) : now;

        let hasMorePages = true;
        while (hasMorePages) {
            const params: Record<string, string | number> = {
                // Wrike already excludes Recycle Bin tasks by default and rejects a deleted param.
                pageSize: PAGE_SIZE,
                sortField: 'UpdatedDate',
                sortOrder: 'Asc',
                fields: JSON.stringify(REQUESTED_FIELDS),
                updatedDate: JSON.stringify({ start: filterStart })
            };

            if (nextPageToken !== undefined) {
                params['nextPageToken'] = nextPageToken;
            }

            // https://developers.wrike.com/api/v4/tasks/#get-tasks
            const response = await nango.get<unknown>({
                endpoint: '/tasks',
                params,
                retries: 3
            });

            const parsed = TasksResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse Wrike tasks response: ${parsed.error.message}`);
            }

            const tasks = parsed.data.data;

            if (tasks.length === 0) {
                // Never follow a nextPageToken returned with an empty page; Wrike rejects such tokens.
                break;
            }

            await nango.batchSave(tasks, 'Task');

            const token = parsed.data.nextPageToken;
            if (token === undefined || token === '') {
                hasMorePages = false;
                break;
            }

            nextPageToken = token;
            await nango.saveCheckpoint({
                updated_after: filterStart,
                window_started_at: windowStartedAt,
                next_page_token: token
            });
        }

        // Trashing a task (directly or by a folder cascade) bumps its updatedDate and moves it into the
        // Recycle Bin, which /tasks never returns, so remove tasks trashed during this window.
        // The initial scan has nothing saved yet to remove.
        if (filterStart !== EPOCH) {
            // https://developers.wrike.com/reference/getaccount
            const accountResponse = await nango.get<unknown>({
                endpoint: '/account',
                retries: 3
            });
            const recycleBinId = AccountResponseSchema.parse(accountResponse.data).data[0]?.recycleBinId;
            if (!recycleBinId) {
                throw new Error('Wrike did not return the account Recycle Bin folder ID.');
            }

            // https://developers.wrike.com/reference/getfolderssingletasks
            for await (const page of nango.paginate<unknown>({
                endpoint: `/folders/${encodeURIComponent(recycleBinId)}/tasks`,
                params: {
                    descendants: 'true',
                    updatedDate: JSON.stringify({ start: filterStart })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'nextPageToken',
                    cursor_path_in_response: 'nextPageToken',
                    response_path: 'data',
                    limit_name_in_request: 'pageSize',
                    limit: PAGE_SIZE
                },
                retries: 3
            })) {
                const deleted = page.map((record) => ({ id: DeletedTaskSchema.parse(record).id }));
                if (deleted.length > 0) {
                    await nango.batchDelete(deleted, 'Task');
                }
            }
        }

        // The scan finished: advance the incremental filter to this run's window start and
        // drop the pagination token. Tasks updated during the scan are re-fetched next run.
        await nango.saveCheckpoint({
            updated_after: windowStartedAt,
            window_started_at: windowStartedAt,
            next_page_token: ''
        });
    }
});

export default sync;
