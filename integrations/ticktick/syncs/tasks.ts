import { createSync } from 'nango';
import { z } from 'zod';

// TickTick's Task resource has no server-side "modified since" filter and no documented
// pagination cursor for its task listing endpoints, so this sync is a full refresh. It uses
// trackDeletesStart/trackDeletesEnd for deletion detection: every fetched task id is seen inside
// the delete-tracking window, and once the full scan finishes, any record not seen is removed.
// Because the whole dataset has to be re-fetched on every run, the sync intentionally does not
// use checkpoints: there is no provider-side watermark to resume from, and resuming a delete-
// tracked full scan mid-run would risk falsely deleting records that were not re-seen yet.
//
// Primary path (verified live): a single account-wide `POST /open/v1/task/filter` with no
// `projectIds` and no `status` returns open, completed and abandoned tasks across every project,
// capped at 200 tasks. The status filter is deliberately omitted: TickTick does not honour `-1`
// there (`[-1, 0, 2]` silently drops abandoned tasks).
// Fallback path (the account-wide call hit its cap): repeat the same filter per project, including
// the inbox, which `GET /open/v1/project` does not list. A project under the cap is complete. A
// project at the cap is re-read through `GET /open/v1/project/{projectId}/data` (all undone tasks)
// and `POST /open/v1/task/completed` paged backwards by completedTime (all completed tasks), but its
// abandoned tasks are only reachable through the capped filter call. In that case the run saves
// everything it fetched and skips trackDeletesEnd, so unseen tasks are never falsely deleted.

const ChecklistItemSchema = z
    .object({
        id: z.string().describe('Unique identifier of the subtask.'),
        title: z.string().describe('Title of the subtask.'),
        status: z.number().int().nullish().describe('Subtask completion status: 0 for normal, 1 for completed.'),
        completedTime: z.string().nullish().describe("Subtask completion timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        isAllDay: z.boolean().nullish().describe('Whether the subtask spans the whole day.'),
        sortOrder: z.number().int().nullish().describe('Ordering value of the subtask within its parent task.'),
        startDate: z.string().nullish().describe("Subtask start timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        timeZone: z.string().nullish().describe('IANA time zone the subtask start time is expressed in.')
    })
    .describe('A checklist (subtask) item nested inside a TickTick task.');

const FocusSummarySchema = z
    .object({
        pomoCount: z.number().int().nullish().describe('Number of completed pomodoro focus sessions for the task.'),
        estimatedPomo: z.number().int().nullish().describe('Estimated number of pomodoro sessions for the task.'),
        estimatedDuration: z.number().int().nullish().describe('Estimated focus duration in seconds.'),
        pomoDuration: z.number().int().nullish().describe('Total pomodoro focus duration in seconds.'),
        stopwatchDuration: z.number().int().nullish().describe('Total stopwatch timing duration in seconds.')
    })
    .describe('Aggregated focus (pomodoro/timing) statistics for a task.');

const TaskSchema = z
    .object({
        id: z.string().describe('Unique identifier of the task.'),
        projectId: z.string().describe('Identifier of the project the task belongs to.'),
        title: z.string().describe('Title of the task.'),
        content: z.string().nullish().describe('Full content body of the task.'),
        desc: z.string().nullish().describe('Description of the task checklist.'),
        isAllDay: z.boolean().nullish().describe('Whether the task spans the whole day.'),
        startDate: z.string().nullish().describe("Task start timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        dueDate: z.string().nullish().describe("Task due timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        completedTime: z.string().nullish().describe("Timestamp the task was completed, in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        timeZone: z.string().nullish().describe('IANA time zone the task start/due times are expressed in.'),
        repeatFlag: z.string().nullish().describe('Recurrence rule for the task, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
        repeatFrom: z
            .string()
            .nullish()
            .describe('Recurrence calculation mode: 0 from the original schedule, 1 from the completion date, 2 from the calendar.'),
        reminders: z.array(z.string()).nullish().describe('Reminder triggers for the task, e.g. "TRIGGER:PT0S".'),
        tags: z.array(z.string()).nullish().describe('Tag names attached to the task.'),
        priority: z.number().int().nullish().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
        status: z.number().int().describe('Task status: -1 abandoned, 0 normal/open, 2 completed.'),
        sortOrder: z.number().int().nullish().describe('Ordering value of the task within its project.'),
        parentId: z.string().nullish().describe('Identifier of the parent task when this task is a subtask.'),
        assigneeUsername: z.string().nullish().describe('Username of the project member the task is assigned to.'),
        kind: z.string().nullish().describe('Task kind: "TEXT", "NOTE" or "CHECKLIST".'),
        etag: z.string().nullish().describe('Entity tag that changes on every write to the task.'),
        createdTime: z.string().nullish().describe("Task creation timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        modifiedTime: z.string().nullish().describe("Task last-modified timestamp in the provider's \"yyyy-MM-dd'T'HH:mm:ssZ\" format."),
        items: z.array(ChecklistItemSchema).nullish().describe('Checklist subtasks nested under the task.'),
        focusSummaries: z.array(FocusSummarySchema).nullish().describe('Aggregated focus statistics for the task.')
    })
    .passthrough()
    .describe('A TickTick task, including its project, status, dates, tags and nested checklist items.');

// Internal response shapes: only used to parse provider payloads, no descriptions required.
const ProjectSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProjectDataSchema = z
    .object({
        tasks: z.array(TaskSchema).optional()
    })
    .passthrough();

// TickTick documents (and live calls confirm) that task/filter and task/completed each return at
// most 200 records with no pagination cursor.
const TASK_PAGE_LIMIT = 200;
const PROJECT_PAGE_LIMIT = 200;
// The inbox is not returned by `GET /open/v1/project`; TickTick accepts this alias for it.
const INBOX_PROJECT_ID = 'inbox';

interface ProjectTasks {
    tasks: TaskRecord[];
    complete: boolean;
}

async function filterTasks(nango: NangoSyncLocal, projectId?: string): Promise<TaskRecord[]> {
    // TickTick Open API - Filter Tasks: https://developer.ticktick.com/docs/openapi.md
    const response = await nango.post({
        endpoint: '/open/v1/task/filter',
        data: projectId === undefined ? {} : { projectIds: [projectId] },
        retries: 3
    });

    return parseTaskArray(response.data, projectId === undefined ? 'task/filter' : `task/filter for project ${projectId}`);
}

async function fetchProjectTasks(nango: NangoSyncLocal, projectId: string): Promise<ProjectTasks> {
    const filtered = await filterTasks(nango, projectId);
    if (filtered.length < TASK_PAGE_LIMIT) {
        return { tasks: filtered, complete: true };
    }

    // TickTick Open API - Get Project With Data (all undone tasks): https://developer.ticktick.com/docs/openapi.md
    const dataResponse = await nango.get({
        endpoint: `/open/v1/project/${encodeURIComponent(projectId)}/data`,
        retries: 3
    });

    const projectData = ProjectDataSchema.safeParse(dataResponse.data);
    if (!projectData.success) {
        throw new Error(`Failed to parse project data for project ${projectId}: ${projectData.error.message}`);
    }

    const completed = await fetchCompletedTasks(nango, projectId);

    // Abandoned tasks beyond the first filter page cannot be fetched, so the project is never complete here.
    return { tasks: [...filtered, ...(projectData.data.tasks ?? []), ...completed], complete: false };
}

async function fetchCompletedTasks(nango: NangoSyncLocal, projectId: string): Promise<TaskRecord[]> {
    const tasks = new Map<string, TaskRecord>();
    let endDate: string | undefined;
    let hasMore = true;

    // The built-in paginator cannot express this completedTime-based backward paging.
    while (hasMore) {
        // TickTick Open API - List Completed Tasks: https://developer.ticktick.com/docs/openapi.md
        // Results are newest-first and endDate is inclusive, so each page resumes at the oldest
        // completedTime of the previous one; overlapping tasks are de-duplicated by id.
        const response = await nango.post({
            endpoint: '/open/v1/task/completed',
            data: { projectIds: [projectId], ...(endDate !== undefined && { endDate }) },
            retries: 3
        });

        const page = parseTaskArray(response.data, `task/completed for project ${projectId}`);
        let added = 0;
        let oldest: string | undefined;
        for (const task of page) {
            if (!tasks.has(task.id)) {
                tasks.set(task.id, task);
                added += 1;
            }
            if (task.completedTime && (oldest === undefined || task.completedTime < oldest)) {
                oldest = task.completedTime;
            }
        }

        // Stop on a short page, or when a full page brought nothing new and paging cannot advance.
        hasMore = page.length >= TASK_PAGE_LIMIT && added > 0 && oldest !== undefined && oldest !== endDate;
        endDate = oldest;
    }

    return Array.from(tasks.values());
}

async function listProjectIds(nango: NangoSyncLocal): Promise<string[]> {
    const ids: string[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        // TickTick Open API - Get User Project (offset/limit pagination): https://developer.ticktick.com/docs/openapi.md
        const response = await nango.get({
            endpoint: '/open/v1/project',
            params: { offset, limit: PROJECT_PAGE_LIMIT },
            retries: 3
        });

        const parsed = z.array(ProjectSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse project list: ${parsed.error.message}`);
        }

        let added = 0;
        for (const project of parsed.data) {
            if (!seen.has(project.id)) {
                seen.add(project.id);
                ids.push(project.id);
                added += 1;
            }
        }

        // Stop when the provider returns a short page, or when an offset-ignoring provider
        // repeats the same page (added === 0) so the loop can never spin forever.
        hasMore = parsed.data.length >= PROJECT_PAGE_LIMIT && added > 0;
        offset += PROJECT_PAGE_LIMIT;
    }

    return ids;
}

function parseTaskArray(payload: unknown, source: string): TaskRecord[] {
    const parsed = z.array(TaskSchema).safeParse(payload);
    if (!parsed.success) {
        throw new Error(`Failed to parse tasks from ${source}: ${parsed.error.message}`);
    }
    return parsed.data;
}

const sync = createSync({
    description:
        'Sync open, completed and abandoned tasks across all projects and the inbox, with a per-project fallback when the account-wide listing hits its 200-task cap.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['tasks:read'],
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Task');

        const accountTasks = await filterTasks(nango);

        let tasks = accountTasks;
        const incompleteProjectIds: string[] = [];
        if (accountTasks.length >= TASK_PAGE_LIMIT) {
            // The account-wide call hit its cap, so it may be incomplete. Re-fetch project-by-project
            // and merge so no reachable task is missed.
            const merged = new Map<string, TaskRecord>();
            for (const task of accountTasks) {
                merged.set(task.id, task);
            }
            for (const projectId of [INBOX_PROJECT_ID, ...(await listProjectIds(nango))]) {
                const projectTasks = await fetchProjectTasks(nango, projectId);
                for (const task of projectTasks.tasks) {
                    merged.set(task.id, task);
                }
                if (!projectTasks.complete) {
                    incompleteProjectIds.push(projectId);
                }
            }
            tasks = Array.from(merged.values());
        }

        if (tasks.length > 0) {
            await nango.batchSave(tasks, 'Task');
        }

        if (incompleteProjectIds.length > 0) {
            // Ending delete tracking now would delete every task this run could not reach.
            await nango.log(
                `Skipping deletion detection: projects ${incompleteProjectIds.join(', ')} hold at least ${TASK_PAGE_LIMIT} tasks, so their abandoned tasks cannot be fully listed.`,
                { level: 'warn' }
            );
            return;
        }

        await nango.trackDeletesEnd('Task');
    }
});

export type TaskRecord = z.infer<typeof TaskSchema>;
export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
