import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

// Wrike's task listings return only a minimal field set unless the extra fields are requested.
// The full HTML description is left out to keep large pages under the action output limit; briefDescription is included.
const TASK_FIELDS = [
    'parentIds',
    'superParentIds',
    'sharedIds',
    'responsibleIds',
    'responsiblePlaceholderIds',
    'authorIds',
    'followerIds',
    'briefDescription',
    'hasAttachments',
    'attachmentCount',
    'superTaskIds',
    'subTaskIds',
    'dependencyIds',
    'billingType',
    'recurrent',
    'customItemTypeId',
    'workScheduleId',
    'metadata',
    'customFields',
    'effortAllocation',
    'finance'
];

const TaskDatesSchema = z.object({
    type: z.string().optional().describe('Task date type: "Milestone", "Backlog", or "Planned".'),
    duration: z.number().optional().describe('Task duration in minutes (one day equals 480 minutes).'),
    start: z.string().optional().describe('Task start date in local time, e.g. "2026-10-14T09:00:00".'),
    due: z.string().optional().describe('Task due date in local time, e.g. "2026-10-16T17:00:00".'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends are included in the task schedule.')
});

const TaskMetadataSchema = z.object({
    key: z.string().describe('Metadata entry key.'),
    value: z.string().describe('Metadata entry value, serialized as a string.')
});

const TaskCustomFieldSchema = z.object({
    id: z.string().describe('Custom field ID.'),
    value: z.string().describe('Value stored in the custom field for this task.')
});

const DailyAllocationSchema = z.object({
    date: z.string().describe('Day of the allocation in yyyy-MM-dd format.'),
    effortMinutes: z.number().describe('Effort allocated to the assignee on that day, in minutes.')
});

const ResponsibleAllocationSchema = z.object({
    userId: z.string().describe('ID of the assignee the effort is allocated to.'),
    dailyAllocation: z.array(DailyAllocationSchema).optional().describe('Per-day effort allocated to this assignee.')
});

const TaskEffortSchema = z.object({
    mode: z.string().optional().describe('Effort mode: "Basic", "Flexible", "FullTime", or "None".'),
    dailyAllocationPercentage: z.number().optional().describe('Daily allocation in percent, for effort daily mode.'),
    allocatedEffort: z.number().optional().describe('Allocated effort in minutes.'),
    totalEffort: z.number().optional().describe('Total effort in minutes.'),
    responsibleAllocation: z
        .array(ResponsibleAllocationSchema)
        .optional()
        .describe('Per-assignee daily effort allocation; empty unless effort has been allocated to individual assignees.')
});

const TaskFinanceSchema = z.object({
    plannedCost: z.number().optional().describe('Planned cost.'),
    plannedFees: z.number().optional().describe('Planned fees.'),
    currency: z.string().optional().describe('Currency code for the finance values.'),
    actualFees: z.number().optional().describe('Actual fees.'),
    actualCost: z.number().optional().describe('Actual cost.')
});

const CascadingFieldSettingsSchema = z.object({
    systemField: z.boolean().optional().describe('Whether this is a system cascading field.'),
    enabledBy: z.string().optional().describe('User ID that enabled the cascading field.'),
    enabledAt: z.string().optional().describe('Instant the cascading field was enabled, in UTC.'),
    fieldId: z.string().optional().describe('Custom field ID the cascading setting applies to.')
});

const TaskSchema = z
    .object({
        id: z.string().describe('Unique task ID. Example: "MAAAAAEQ_HoO".'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the task.'),
        title: z.string().optional().describe('Task title.'),
        description: z
            .string()
            .optional()
            .describe('Task description, which may contain HTML. Not requested by this action; use get-task for the full description.'),
        briefDescription: z.string().optional().describe('Short plain-text summary of the task description.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the folder(s) that directly contain the task.'),
        superParentIds: z.array(z.string()).optional().describe('Folder IDs inherited from the parent task.'),
        sharedIds: z.array(z.string()).optional().describe('IDs of users the task is shared with.'),
        responsibleIds: z.array(z.string()).optional().describe('IDs of the users assigned to the task.'),
        responsiblePlaceholderIds: z.array(z.string()).optional().describe('IDs of placeholder assignees on the task.'),
        authorIds: z.array(z.string()).optional().describe('IDs of the task authors.'),
        followerIds: z.array(z.string()).optional().describe('IDs of the users following the task.'),
        followedByMe: z.boolean().optional().describe('Whether the requesting user follows the task.'),
        status: z.string().optional().describe('Task status: "Active", "Deferred", "Completed", or "Cancelled".'),
        importance: z.string().optional().describe('Task importance: "High", "Low", or "Normal".'),
        createdDate: z.string().optional().describe('Instant the task was created, in UTC.'),
        updatedDate: z.string().optional().describe('Instant the task was last updated, in UTC.'),
        completedDate: z.string().optional().describe('Instant the task was completed, in UTC. Present only for completed tasks.'),
        dates: TaskDatesSchema.optional().describe('Task scheduling dates.'),
        scope: z.string().optional().describe('Tree scope of the task, e.g. "WsTask" for active tasks or "RbTask" for trashed tasks.'),
        customStatusId: z.string().optional().describe('ID of the workflow custom status assigned to the task.'),
        customItemTypeId: z.string().optional().describe('ID of the custom item type of the task, when it is not a standard task.'),
        hasAttachments: z.boolean().optional().describe('Whether the task has attachments.'),
        attachmentCount: z.number().optional().describe('Total number of attachments on the task.'),
        permalink: z.string().optional().describe('URL that opens the task in the Wrike web workspace.'),
        priority: z.string().optional().describe('Ordering key that defines the task position in a task list.'),
        superTaskIds: z.array(z.string()).optional().describe('IDs of the parent tasks of this task.'),
        subTaskIds: z.array(z.string()).optional().describe('IDs of the subtasks of this task.'),
        dependencyIds: z.array(z.string()).optional().describe('IDs of dependencies linked to the task.'),
        billingType: z.string().optional().describe('Billing type of the task: "Billable" or "NonBillable".'),
        recurrent: z.boolean().optional().describe('Whether the task is recurrent.'),
        workScheduleId: z.string().optional().describe('ID of the work schedule assigned to the task.'),
        metadata: z.array(TaskMetadataSchema).optional().describe('Custom metadata entries attached to the task.'),
        customFields: z.array(TaskCustomFieldSchema).optional().describe('Custom field values set on the task.'),
        effortAllocation: TaskEffortSchema.optional().describe('Effort allocation configuration for the task.'),
        finance: TaskFinanceSchema.optional().describe('Finance values configured for the task.'),
        cascadingFieldSettings: z.array(CascadingFieldSettingsSchema).optional().describe('Cascading field settings active on the task.')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(TaskSchema).nullable().optional(),
    nextPageToken: z.string().nullable().optional()
});

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the folder or project whose directly contained tasks should be listed. Example: "MQAAAAEQ_HoI".'),
        cursor: z.string().min(1).optional().describe('Opaque pagination token returned as `nextPageToken` by a previous call. Omit to fetch the first page.'),
        pageSize: z.number().int().min(1).max(1000).optional().describe('Maximum number of tasks to return per page, between 1 and 1000.'),
        updatedDate: z
            .object({
                start: z.string().optional().describe('Return only tasks updated at or after this instant, in ISO 8601 UTC, e.g. "2026-10-07T00:00:00Z".'),
                end: z.string().optional().describe('Return only tasks updated at or before this instant, in ISO 8601 UTC.')
            })
            .optional()
            .describe('Optional updated-date range filter; provide a start and/or an end instant.')
    })
    .describe('Filters for listing the tasks directly contained in a folder or project.');

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Tasks that live directly in the requested folder or project.'),
        nextPageToken: z.string().optional().describe('Opaque token to pass back as `cursor` to fetch the next page. Omitted when there are no more tasks.')
    })
    .describe('A page of tasks directly contained in the requested folder or project, plus a token for the next page.');

/**
 * @tags: [read]
 * @tagReason: Lists tasks from a folder; it only reads provider data and makes no provider-side changes.
 * @pitfalls: Only tasks that directly belong to the folder are returned; tasks in descendant folders and subtasks are excluded. Soft-deleted tasks are never returned.
 */
const action = createAction({
    description: 'List only the tasks that live directly inside a specific folder or project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            fields: JSON.stringify(TASK_FIELDS)
        };

        if (input.cursor !== undefined) {
            params['nextPageToken'] = input.cursor;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.updatedDate !== undefined) {
            const range: { start?: string; end?: string } = {};
            if (input.updatedDate.start !== undefined) {
                range.start = input.updatedDate.start;
            }
            if (input.updatedDate.end !== undefined) {
                range.end = input.updatedDate.end;
            }
            if (Object.keys(range).length > 0) {
                params['updatedDate'] = JSON.stringify(range);
            }
        }

        const config: ProxyConfiguration = {
            // https://developers.wrike.com/reference/getfolderssingletasks
            endpoint: `/folders/${encodeURIComponent(input.folderId)}/tasks`,
            params,
            retries: 3
        };

        const response = await nango.get<unknown>(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        const tasks = parsed.data ?? [];

        return {
            tasks,
            // Wrike can return a nextPageToken with an empty page that it then rejects, so only expose it alongside results.
            ...(tasks.length > 0 && parsed.nextPageToken != null && parsed.nextPageToken !== '' && { nextPageToken: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
