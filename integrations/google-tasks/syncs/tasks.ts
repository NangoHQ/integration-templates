import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { ProviderTaskListSchema, ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const TaskRecordSchema = TaskSchema.omit({ deleted: true })
    .extend({
        tasklistId: z.string().describe('Id of the task list that currently contains the task. Updated in place when the task is moved to another list.'),
        updated: z.string().describe('Last modification time of the task in RFC 3339 format, used as the incremental watermark.')
    })
    .describe('A single Google Task. The record id is the Google task id, which is globally unique and survives moves between task lists.');

const CheckpointSchema = z
    .object({})
    .catchall(z.string())
    .describe(
        'Map of `tasklist:<task list id>` keys to the newest task `updated` timestamp seen for that list, used as `updatedMin` on the next incremental run.'
    );

const ProviderSyncTaskSchema = ProviderTaskSchema.extend({
    updated: z.string()
});

const ErrorStatusSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number().optional()
        })
        .optional()
});

function isNotFoundError(error: unknown): boolean {
    const parsed = ErrorStatusSchema.safeParse(error);
    return parsed.success && (parsed.data.status === 404 || parsed.data.response?.status === 404);
}

const CURSOR_PREFIX = 'tasklist:';

/**
 * Change source: tasks.list `updatedMin` per task list, with `showDeleted=true` so deletions arrive as
 * `deleted: true` tombstones (routed to batchDelete). Google Tasks has no change feed for task lists themselves,
 * so a deleted list is detected by comparing the enumerated lists with the checkpoint keys. On the first run,
 * or when a list has vanished, the sync does a full reconcile of every list (no `updatedMin`) wrapped in
 * trackDeletesStart/trackDeletesEnd so the vanished list's tasks are removed.
 */
const sync = createSync({
    description:
        'Sync every task across every task list in the account, incrementally, including completed, hidden, and assigned tasks; deleted tasks and tasks of deleted lists are removed.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['https://www.googleapis.com/auth/tasks'],
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskRecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const previousCursors: Record<string, string> = {};
        for (const [key, value] of Object.entries(checkpoint ?? {})) {
            if (key.startsWith(CURSOR_PREFIX)) {
                previousCursors[key] = value;
            }
        }

        const listConfig: ProxyConfiguration = {
            // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
            endpoint: '/tasks/v1/users/@me/lists',
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

        const tasklistIds: string[] = [];
        for await (const listPage of nango.paginate(listConfig)) {
            for (const item of listPage) {
                tasklistIds.push(ProviderTaskListSchema.parse(item).id);
            }
        }

        const currentKeys = new Set(tasklistIds.map((id) => CURSOR_PREFIX + id));
        const vanishedKeys = Object.keys(previousCursors).filter((key) => !currentKeys.has(key));

        // Full reconcile on the first run (no per-list cursors yet) or when a task list disappeared: deleted lists
        // leave no tombstones, so their tasks can only be removed by trackDeletes over a complete fetch.
        const fullReconcile = Object.keys(previousCursors).length === 0 || vanishedKeys.length > 0;

        if (fullReconcile) {
            await nango.trackDeletesStart('Task');
        }

        if (vanishedKeys.length > 0) {
            await nango.log(`Detected ${vanishedKeys.length} deleted task list(s); running a full reconcile.`);
        }

        // Per-list cursors produced by this run. Lists that 404 mid-run are left out so they get reconciled.
        const nextCursors: Record<string, string> = {};

        for (const tasklistId of tasklistIds) {
            const cursorKey = CURSOR_PREFIX + tasklistId;
            const updatedMin = fullReconcile ? undefined : previousCursors[cursorKey];

            const tasksConfig: ProxyConfiguration = {
                // https://developers.google.com/tasks/reference/rest/v1/tasks/list
                endpoint: `/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks`,
                params: {
                    showCompleted: 'true',
                    showHidden: 'true',
                    showAssigned: 'true',
                    // A full reconcile only needs live tasks; incremental runs need tombstones to detect deletions.
                    showDeleted: fullReconcile ? 'false' : 'true',
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

            let maxUpdated = previousCursors[cursorKey];

            // @allowTryCatch A task list deleted after enumeration returns 404 "Task list not found"; skip it instead of failing the run.
            try {
                for await (const taskPage of nango.paginate(tasksConfig)) {
                    const tasks = z.array(ProviderSyncTaskSchema).parse(taskPage);

                    const records = tasks
                        .filter((task) => task.deleted !== true)
                        .map((task) => ({
                            ...toTask({ ...task, deleted: undefined }),
                            tasklistId,
                            updated: task.updated
                        }));

                    const deletions = tasks.filter((task) => task.deleted === true).map((task) => ({ id: task.id }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Task');
                    }

                    if (deletions.length > 0) {
                        await nango.batchDelete(deletions, 'Task');
                    }

                    for (const task of tasks) {
                        if (maxUpdated === undefined || task.updated > maxUpdated) {
                            maxUpdated = task.updated;
                        }
                    }
                }
            } catch (error) {
                if (!isNotFoundError(error)) {
                    throw error;
                }
                // The list was deleted after it was enumerated. Keep its old cursor so the next run sees it as
                // vanished and reconciles; in a full reconcile its tasks are simply not saved and get removed below.
                await nango.log(`Task list ${tasklistId} was not found; it will be reconciled as deleted.`);
                continue;
            }

            if (maxUpdated !== undefined) {
                nextCursors[cursorKey] = maxUpdated;
            }

            // Keep keys of lists not processed yet (and of vanished lists) so an interrupted run resumes safely.
            await nango.saveCheckpoint({ ...previousCursors, ...nextCursors });
        }

        if (fullReconcile) {
            await nango.trackDeletesEnd('Task');
            // Prune cursors of vanished lists only once their tasks have been removed.
            await nango.saveCheckpoint(nextCursors);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
