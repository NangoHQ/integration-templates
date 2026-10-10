import { z } from 'zod';
import { createAction } from 'nango';

const TaskDatesSchema = z
    .object({
        type: z.string().optional().describe('Schedule type of the task. One of "Milestone", "Backlog", or "Planned".'),
        duration: z.number().optional().describe('Task duration in minutes (1 day = 480 minutes). Present for Planned tasks.'),
        start: z.string().optional().describe('Start date in yyyy-MM-ddTHH:mm:ss local format. Present for Planned tasks.'),
        due: z.string().optional().describe('Due date in yyyy-MM-ddTHH:mm:ss local format. Present for Planned and Milestone tasks.'),
        workOnWeekends: z.boolean().optional().describe('Whether weekends are included in the task schedule.')
    })
    .describe('Scheduling information for the task.');

const CustomFieldSchema = z
    .object({
        id: z.string().describe('Custom field definition ID.'),
        value: z.string().describe('Value stored for this custom field on the task.')
    })
    .describe('A custom field value attached to a task or folder.');

const MetadataSchema = z
    .object({
        key: z.string().describe('Metadata entry key.'),
        value: z.string().describe('Metadata entry value.')
    })
    .describe('A key/value metadata entry isolated per client application.');

const ProjectSchema = z
    .object({
        authorId: z.string().optional().describe('User ID of the project author.'),
        ownerIds: z.array(z.string()).optional().describe('User IDs of the project owners.'),
        customStatusId: z.string().optional().describe('Custom status ID currently set on the project.'),
        createdDate: z.string().optional().describe('Project creation timestamp in ISO 8601 format.'),
        status: z.string().optional().describe('Project status, for example "Green", "Yellow", "Red", or "Completed".'),
        startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format.'),
        endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format.'),
        completedDate: z.string().optional().describe('Project completion timestamp in ISO 8601 format.'),
        contractType: z.string().optional().describe('Project contract type, either "Billable" or "NonBillable".')
    })
    .describe('Project-specific metadata present only when the folder is a Project.');

const TaskSchema = z
    .object({
        id: z.string().describe('Unique task ID.'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the task.'),
        title: z.string().optional().describe('Task title.'),
        description: z.string().optional().describe('Task description, usually HTML.'),
        briefDescription: z.string().optional().describe('Plain-text summary of the task description.'),
        parentIds: z.array(z.string()).optional().describe('Folder IDs that directly contain the task. For subtasks this is the account logical Root folder.'),
        superParentIds: z.array(z.string()).optional().describe('Folder IDs inherited from a parent task; used to locate the containing folder for subtasks.'),
        sharedIds: z.array(z.string()).optional().describe('User IDs the task is shared with.'),
        responsibleIds: z.array(z.string()).optional().describe('User IDs assigned to the task.'),
        responsiblePlaceholderIds: z.array(z.string()).optional().describe('Placeholder assignee IDs for the task.'),
        status: z.string().optional().describe('Task status: "Active", "Deferred", "Completed", or "Cancelled".'),
        importance: z.string().optional().describe('Task importance: "High", "Low", or "Normal".'),
        createdDate: z.string().optional().describe('Task creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        completedDate: z.string().optional().describe('Completion timestamp in ISO 8601 format. Present only for completed tasks.'),
        dates: TaskDatesSchema.optional().describe('Scheduling information for the task.'),
        scope: z.string().optional().describe('Tree scope of the task, for example "WsTask" for an active task or "RbTask" for a trashed task.'),
        authorIds: z.array(z.string()).optional().describe('User IDs of the task authors.'),
        customStatusId: z.string().optional().describe('Custom workflow status ID currently set on the task.'),
        hasAttachments: z.boolean().optional().describe('Whether the task has attachments.'),
        attachmentCount: z.number().optional().describe('Number of attachments on the task.'),
        permalink: z.string().optional().describe('URL that opens the task in the Wrike web workspace.'),
        priority: z.string().optional().describe('Ordering key that defines the task position in a task list.'),
        followedByMe: z.boolean().optional().describe('Whether the current user follows the task.'),
        followerIds: z.array(z.string()).optional().describe('User IDs that follow the task.'),
        superTaskIds: z.array(z.string()).optional().describe('Parent task IDs when the task is a subtask.'),
        subTaskIds: z.array(z.string()).optional().describe('Child task IDs of the task.'),
        dependencyIds: z.array(z.string()).optional().describe('Dependency IDs linking the task to predecessors or successors.'),
        recurrent: z.boolean().optional().describe('Whether the task is recurrent.'),
        billingType: z.string().optional().describe('Billing type for the task timelogs, either "Billable" or "NonBillable".'),
        customItemTypeId: z.string().optional().describe('Custom work item type ID for the task.'),
        workScheduleId: z.string().optional().describe('ID of the work schedule assigned to the task.'),
        customFields: z.array(CustomFieldSchema).optional().describe('Custom field values set on the task.'),
        metadata: z.array(MetadataSchema).optional().describe('Client-scoped metadata entries on the task.')
    })
    .describe('The full task record returned by the Wrike API.');

const FolderSchema = z
    .object({
        id: z.string().describe('Unique folder or project ID.'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the folder.'),
        title: z.string().optional().describe('Folder or project title.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        description: z.string().optional().describe('Folder description.'),
        briefDescription: z.string().optional().describe('Plain-text summary of the folder description.'),
        parentIds: z.array(z.string()).optional().describe('Parent folder IDs of the folder.'),
        childIds: z.array(z.string()).optional().describe('Direct child folder IDs of the folder.'),
        superParentIds: z.array(z.string()).optional().describe('Folder IDs inherited from a parent folder.'),
        sharedIds: z.array(z.string()).optional().describe('User IDs the folder is shared with.'),
        scope: z.string().optional().describe('Tree scope of the folder, for example "WsFolder" for an active folder or "RbFolder" for a trashed folder.'),
        hasAttachments: z.boolean().optional().describe('Whether the folder has attachments.'),
        attachmentCount: z.number().optional().describe('Number of attachments on the folder.'),
        permalink: z.string().optional().describe('URL that opens the folder in the Wrike web workspace.'),
        workflowId: z.string().optional().describe('ID of the workflow applied to the folder.'),
        color: z.string().optional().describe('Folder color label.'),
        space: z.boolean().optional().describe('Whether the folder is a Space.'),
        contractType: z.string().optional().describe('Contract type of the folder, either "Billable" or "NonBillable".'),
        customItemTypeId: z.string().optional().describe('Custom work item type ID for the folder.'),
        project: ProjectSchema.optional().describe('Project metadata. Present only when the folder is a Project; absent for plain folders.'),
        customFields: z.array(CustomFieldSchema).optional().describe('Custom field values set on the folder.'),
        metadata: z.array(MetadataSchema).optional().describe('Client-scoped metadata entries on the folder.')
    })
    .describe('The parent folder or project record returned by the Wrike API.');

const ExternalRequesterSchema = z.object({
    id: z.string().describe('Wrike ID of the external requester.'),
    email: z.string().describe('Email address of the external requester.'),
    firstName: z.string().describe('First name of the external requester.'),
    lastName: z.string().optional().describe('Last name of the external requester, when provided.')
});

const CommentSchema = z
    .object({
        id: z.string().describe('Unique comment ID.'),
        authorId: z.string().optional().describe('User ID of the comment author.'),
        text: z.string().optional().describe('Comment body, usually HTML.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Update timestamp in ISO 8601 format; mirrors the created date.'),
        taskId: z.string().optional().describe('ID of the related task, when the comment is on a task.'),
        folderId: z.string().optional().describe('ID of the related folder, when the comment is on a folder.'),
        type: z.string().optional().describe('Comment type, either "Regular" or "Email".'),
        emailSubject: z.string().optional().describe('Subject line for email comments.'),
        direction: z.string().optional().describe('Direction ("Outgoing" or "Incoming") for email comments.'),
        attachmentIds: z.array(z.string()).optional().describe('IDs of files attached to the comment.'),
        externalRequester: ExternalRequesterSchema.optional().describe(
            'Details of the commenter outside the account; present only for email comments from external requesters.'
        )
    })
    .describe('A comment posted on the task.');

const TimelogSchema = z
    .object({
        id: z.string().describe('Unique timelog ID.'),
        taskId: z.string().optional().describe('ID of the task the time was logged against.'),
        userId: z.string().optional().describe('User ID of the person who logged the time.'),
        hours: z.number().optional().describe('Hours tracked in the timelog record.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        trackedDate: z.string().optional().describe('Date the time was recorded for, in yyyy-MM-dd format.'),
        comment: z.string().optional().describe('Free-text note on the timelog entry.'),
        categoryId: z.string().optional().describe('Timelog category ID.'),
        billingType: z.string().optional().describe('Billing type, either "Billable" or "NonBillable".'),
        approvalStatus: z.string().optional().describe('Timesheet approval status of the entry.'),
        lockStatus: z.string().optional().describe('Lock status, either "Locked" or "Unlocked".'),
        exportStatus: z.string().optional().describe('Export status of the entry.')
    })
    .describe('A time-tracking entry logged against the task.');

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task to gather full context for. Example: "MAAAAAEQ_HoO".')
    })
    .describe('Identifies the task whose full context should be fetched.');

const OutputSchema = z
    .object({
        task: TaskSchema.describe('The task record itself, including status, dates, assignees, dependencies, and custom fields.'),
        parentFolder: FolderSchema.nullable().describe(
            'The immediate containing folder or project. Null when the parent cannot be resolved, such as for subtasks whose parent is the account logical Root folder.'
        ),
        comments: z.array(CommentSchema).describe('All comments posted on the task, in the order returned by the provider. Empty array when there are none.'),
        timelogs: z.array(TimelogSchema).describe('All timelog entries logged against the task. Empty array when there are none.')
    })
    .describe('A single task merged with its comments, timelogs, and parent folder/project metadata.');

const TaskEnvelopeSchema = z.object({ data: z.array(TaskSchema) });
const FolderEnvelopeSchema = z.object({ data: z.array(FolderSchema) });
const CommentEnvelopeSchema = z.object({ data: z.array(CommentSchema) });
const TimelogEnvelopeSchema = z.object({ data: z.array(TimelogSchema) });

/**
 * @tags: [read]
 * @tagReason: Reads an existing task, its comments, its timelogs, and its parent folder; it never modifies provider data.
 * @pitfalls: `parentFolder` is the immediate containing folder or project, but for subtasks it is resolved from the inherited folder instead, and it is null when the task sits at the account root or no parent folder can be resolved.
 */
const action = createAction({
    description:
        'COMPOSITE: get a single task full picture in one call - its own fields, every comment on it, every logged timelog entry, and its parent folder/project metadata - merged into one response.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fetchFolderOrNull = async (folderId: string): Promise<z.infer<typeof FolderSchema> | null> => {
            // @allowTryCatch: the logical Root folder is rejected by GET /folders/{id}; treat any parent-folder lookup failure as "no resolvable folder" instead of failing the whole composite.
            try {
                // https://developers.wrike.com/api/v4/folders-projects/ (Get Folder)
                const response = await nango.get({
                    endpoint: `/folders/${encodeURIComponent(folderId)}`,
                    retries: 3
                });
                const parsed = FolderEnvelopeSchema.parse(response.data);
                return parsed.data[0] ?? null;
            } catch {
                return null;
            }
        };

        const taskId = encodeURIComponent(input.taskId);

        // https://developers.wrike.com/api/v4/tasks/ (Get Task)
        const taskResponse = await nango.get({
            endpoint: `/tasks/${taskId}`,
            retries: 3
        });
        const taskEnvelope = TaskEnvelopeSchema.parse(taskResponse.data);
        const task = taskEnvelope.data[0];
        if (!task) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Task ${input.taskId} was not found.`
            });
        }

        // https://developers.wrike.com/api/v4/comments/ (Get Task Comments)
        const commentsResponse = await nango.get({
            endpoint: `/tasks/${taskId}/comments`,
            // Wrike omits the comment type unless it is requested through fields.
            params: { fields: JSON.stringify(['type']) },
            retries: 3
        });
        const comments = CommentEnvelopeSchema.parse(commentsResponse.data).data;

        // https://developers.wrike.com/api/v4/timelogs/ (Get Task Timelogs)
        const timelogsResponse = await nango.get({
            endpoint: `/tasks/${taskId}/timelogs`,
            // Wrike omits these status fields unless they are requested through fields.
            params: { fields: JSON.stringify(['billingType', 'approvalStatus', 'lockStatus', 'exportStatus']) },
            retries: 3
        });
        const timelogs = TimelogEnvelopeSchema.parse(timelogsResponse.data).data;

        let parentFolder: z.infer<typeof FolderSchema> | null = null;
        const parentId = task.parentIds?.[0];
        if (parentId) {
            parentFolder = await fetchFolderOrNull(parentId);
        }
        const superParentId = task.superParentIds?.[0];
        if (!parentFolder && superParentId) {
            parentFolder = await fetchFolderOrNull(superParentId);
        }

        return {
            task,
            parentFolder,
            comments,
            timelogs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
