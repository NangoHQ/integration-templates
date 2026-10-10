import { z } from 'zod';
import { createAction } from 'nango';

const DateRangeSchema = z.object({
    start: z.string().optional().describe('Range start in ISO 8601 format, e.g. "2026-10-07T00:00:00Z".'),
    end: z.string().optional().describe('Range end in ISO 8601 format, e.g. "2026-10-08T00:00:00Z".')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination token (`nextPageToken`) returned by a previous call. Omit to fetch the first page.'),
        pageSize: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Maximum number of tasks to return per page (1-1000). Wrike defaults to 1000 when omitted.'),
        updatedDate: DateRangeSchema.optional().describe('Only return tasks whose last update falls within this range.'),
        createdDate: DateRangeSchema.optional().describe('Only return tasks whose creation falls within this range.')
    })
    .describe('Filters for listing tasks across the account.');

const TaskDatesSchema = z.object({
    type: z.string().optional().describe('Date type: "Milestone", "Backlog", or "Planned".'),
    duration: z.number().optional().describe('Duration in minutes.'),
    start: z.string().optional().describe('Start date in local ISO 8601 format, e.g. "2026-10-02T09:00:00".'),
    due: z.string().optional().describe('Due date in local ISO 8601 format, e.g. "2026-10-02T17:00:00".'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends are included in scheduling.')
});

const TaskSchema = z.object({
    id: z.string().describe('Unique task ID.'),
    accountId: z.string().optional().describe('ID of the account the task belongs to.'),
    title: z.string().describe('Task title.'),
    status: z.string().optional().describe('Task status: "Active", "Deferred", "Completed", or "Cancelled".'),
    importance: z.string().optional().describe('Task importance: "High", "Normal", or "Low".'),
    createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 UTC format.'),
    updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 UTC format.'),
    completedDate: z.string().optional().describe('Completion timestamp in ISO 8601 UTC format; absent unless the task is completed.'),
    dates: TaskDatesSchema.optional().describe('Scheduling dates for the task.'),
    scope: z.string().optional().describe('Task scope, e.g. "WsTask" for active tasks.'),
    customStatusId: z.string().optional().describe('ID of the custom status assigned to the task.'),
    permalink: z.string().optional().describe('URL to open the task in the Wrike workspace.'),
    priority: z.string().optional().describe('Ordering key that defines the task order within its list.')
});

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Tasks matching the requested filters.'),
        nextPageToken: z.string().optional().describe('Token to fetch the next page of results; absent when there are no more tasks.')
    })
    .describe('A page of tasks with an optional pagination token.');

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    nextPageToken: z.string().optional(),
    responseSize: z.number().optional(),
    data: z.array(TaskSchema)
});

/**
 * @tags: [read]
 * @tagReason: Lists tasks from the account without modifying any provider data.
 * @pitfalls: Soft-deleted (Recycle Bin) tasks are never returned and cannot be included; a date range whose `start` is in the future returns an empty list rather than an error.
 */
const action = createAction({
    description: 'List tasks across the whole account, optionally filtered by an updated/created date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['nextPageToken'] = input.cursor;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.updatedDate !== undefined) {
            params['updatedDate'] = JSON.stringify(input.updatedDate);
        }
        if (input.createdDate !== undefined) {
            params['createdDate'] = JSON.stringify(input.createdDate);
        }

        const response = await nango.get({
            // https://developers.wrike.com/reference/gettasksempty
            endpoint: '/tasks',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            tasks: parsed.data.map((task) => ({
                id: task.id,
                ...(task.accountId != null && { accountId: task.accountId }),
                title: task.title,
                ...(task.status != null && { status: task.status }),
                ...(task.importance != null && { importance: task.importance }),
                ...(task.createdDate != null && { createdDate: task.createdDate }),
                ...(task.updatedDate != null && { updatedDate: task.updatedDate }),
                ...(task.completedDate != null && { completedDate: task.completedDate }),
                ...(task.dates != null && { dates: task.dates }),
                ...(task.scope != null && { scope: task.scope }),
                ...(task.customStatusId != null && { customStatusId: task.customStatusId }),
                ...(task.permalink != null && { permalink: task.permalink }),
                ...(task.priority != null && { priority: task.priority })
            })),
            ...(parsed.nextPageToken != null && { nextPageToken: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
