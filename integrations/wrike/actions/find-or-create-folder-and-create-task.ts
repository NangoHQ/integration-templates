import { z } from 'zod';
import { createAction } from 'nango';

const ProjectStatusEnum = z.enum(['Red', 'OnHold', 'Yellow', 'Completed', 'Custom', 'Cancelled', 'Green']);
const TaskStatusEnum = z.enum(['Active', 'Deferred', 'Completed', 'Cancelled']);
const TaskImportanceEnum = z.enum(['High', 'Low', 'Normal']);
const TaskDatesTypeEnum = z.enum(['Milestone', 'Backlog', 'Planned']);
const BillingTypeEnum = z.enum(['Billable', 'NonBillable']);

const ProjectInputSchema = z.object({
    ownerIds: z.array(z.string()).optional().describe('User IDs to set as project owners.'),
    startDate: z.string().optional().describe('Project start date, format yyyy-MM-dd.'),
    endDate: z.string().optional().describe('Project end date, format yyyy-MM-dd.'),
    status: ProjectStatusEnum.optional().describe('Project status.'),
    customStatusId: z.string().optional().describe('Project custom status ID, used when status is "Custom".'),
    budget: z.number().int().optional().describe('Project budget as a whole number. Decimal values are rejected by the API.'),
    contractType: BillingTypeEnum.optional().describe('Project contract type.')
});

const TaskDatesInputSchema = z.object({
    type: TaskDatesTypeEnum.optional().describe('Task date type. Omit for a backlog task.'),
    start: z.string().optional().describe('Start date/time, format yyyy-MM-ddTHH:mm:ss. Requires a due date or duration.'),
    due: z.string().optional().describe('Due date/time, format yyyy-MM-ddTHH:mm:ss. Setting a due date alone creates a milestone.'),
    duration: z.number().optional().describe('Duration in minutes; one day equals 480 minutes.'),
    workOnWeekends: z.boolean().optional().describe('Whether weekends are included in scheduling.')
});

const TaskCustomFieldInputSchema = z.object({
    id: z.string().describe('Custom field ID.'),
    value: z.string().describe('Value to set for the custom field.')
});

const InputSchema = z
    .object({
        parentFolderId: z.string().describe('ID of the parent folder or space to search for the folder/project and create it in.'),
        folderName: z.string().min(1).describe('Exact, case-sensitive title of the folder/project to reuse or create.'),
        folderDescription: z.string().optional().describe('Description to set on the folder/project when it is newly created.'),
        project: ProjectInputSchema.optional().describe(
            'When provided, a newly created folder becomes a Project with these settings. Ignored when an existing folder is reused.'
        ),
        taskTitle: z.string().min(1).describe('Title of the task to create.'),
        taskDescription: z.string().optional().describe('Description of the task.'),
        taskStatus: TaskStatusEnum.optional().describe('Status of the task.'),
        taskImportance: TaskImportanceEnum.optional().describe('Importance of the task.'),
        taskDates: TaskDatesInputSchema.optional().describe('Scheduling dates for the task. Omit to create a backlog task.'),
        taskResponsibles: z.array(z.string()).optional().describe('User IDs to assign as task assignees.'),
        taskFollowers: z.array(z.string()).optional().describe('User IDs to add as task followers.'),
        taskSuperTasks: z.array(z.string()).optional().describe('Parent task IDs that make the new task a subtask.'),
        taskCustomFields: z.array(TaskCustomFieldInputSchema).optional().describe('Custom field values to set on the task.'),
        taskCustomStatusId: z.string().optional().describe('Custom status ID for the task.'),
        taskBillingType: BillingTypeEnum.optional().describe('Billing type for the task timelogs.')
    })
    .describe('Input for finding or creating a folder/project by title under a parent folder, then creating a task inside it.');

const FolderSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    scope: z.string().optional(),
    project: z.unknown().optional()
});

const ListFoldersResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(FolderSchema)
});

const CreateFolderResponseSchema = z.object({
    data: z.array(FolderSchema)
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    accountId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    importance: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    completedDate: z.string().optional(),
    scope: z.string().optional(),
    permalink: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    responsibleIds: z.array(z.string()).optional(),
    superTaskIds: z.array(z.string()).optional(),
    subTaskIds: z.array(z.string()).optional(),
    customStatusId: z.string().optional()
});

const CreateTaskResponseSchema = z.object({
    data: z.array(ProviderTaskSchema)
});

const OutputTaskSchema = z.object({
    id: z.string().describe('Created task ID.'),
    accountId: z.string().optional().describe('Wrike account ID that owns the task.'),
    title: z.string().optional().describe('Task title.'),
    description: z.string().optional().describe('Task description.'),
    status: z.string().optional().describe('Task status.'),
    importance: z.string().optional().describe('Task importance.'),
    createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
    updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
    completedDate: z.string().optional().describe('Completion timestamp in ISO 8601 format, present when the task is completed.'),
    scope: z.string().optional().describe('Task scope, for example WsTask.'),
    permalink: z.string().optional().describe('URL to open the task in Wrike.'),
    parentIds: z.array(z.string()).optional().describe('IDs of the folders the task belongs to.'),
    responsibleIds: z.array(z.string()).optional().describe('IDs of the users assigned to the task.'),
    superTaskIds: z.array(z.string()).optional().describe('IDs of the parent (super) tasks.'),
    subTaskIds: z.array(z.string()).optional().describe('IDs of the subtasks.'),
    customStatusId: z.string().optional().describe('Custom status ID of the task.')
});

const OutputSchema = z
    .object({
        folderId: z.string().describe('ID of the folder/project the task was created in, either reused or newly created.'),
        folderWasCreated: z.boolean().describe('True when a new folder/project was created, false when an existing one was reused.'),
        task: OutputTaskSchema.describe('The newly created task.')
    })
    .describe('The resolved folder/project ID, whether it was newly created, and the newly created task.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the parent folder's subtree to decide whether to reuse or create a folder, then creates a folder/project when missing and a task inside it.
 * @pitfalls: Folder title matching is exact and case-sensitive and scans the entire subtree, so a same-titled folder nested deeper is reused; when an existing folder is reused any project settings are ignored (it is not converted to a Project); if task creation fails after the folder is created the new empty folder is left behind; a space-scoped custom field set on a task outside that field's space can report success without persisting.
 */
const action = createAction({
    description: 'Composite: create a task inside a folder/project named by title under a parent, creating that folder first if it does not exist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/getfolderssinglefolders.md
        const listResponse = await nango.get<unknown>({
            endpoint: `/folders/${encodeURIComponent(input.parentFolderId)}/folders`,
            retries: 3
        });
        const listedFolders = ListFoldersResponseSchema.parse(listResponse.data);
        const existingFolder = listedFolders.data.find((folder) => folder.id !== input.parentFolderId && folder.title === input.folderName);

        let folderId: string;
        let folderWasCreated: boolean;

        if (existingFolder) {
            folderId = existingFolder.id;
            folderWasCreated = false;
        } else {
            const folderParams: Record<string, string> = { title: input.folderName };
            if (input.folderDescription !== undefined) {
                folderParams['description'] = input.folderDescription;
            }
            if (input.project !== undefined) {
                const project: Record<string, unknown> = {};
                if (input.project.ownerIds !== undefined) {
                    project['ownerIds'] = input.project.ownerIds;
                }
                if (input.project.startDate !== undefined) {
                    project['startDate'] = input.project.startDate;
                }
                if (input.project.endDate !== undefined) {
                    project['endDate'] = input.project.endDate;
                }
                if (input.project.status !== undefined) {
                    project['status'] = input.project.status;
                }
                if (input.project.customStatusId !== undefined) {
                    project['customStatusId'] = input.project.customStatusId;
                }
                if (input.project.budget !== undefined) {
                    project['budget'] = input.project.budget;
                }
                if (input.project.contractType !== undefined) {
                    project['contractType'] = input.project.contractType;
                }
                folderParams['project'] = JSON.stringify(project);
            }

            // https://developers.wrike.com/reference/postfolderssinglefolders.md
            const createFolderResponse = await nango.post<unknown>({
                endpoint: `/folders/${encodeURIComponent(input.parentFolderId)}/folders`,
                params: folderParams,
                // Not idempotent: a retry after a lost response would create a duplicate folder.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
            const createdFolders = CreateFolderResponseSchema.parse(createFolderResponse.data);
            const createdFolder = createdFolders.data[0];
            if (!createdFolder) {
                throw new nango.ActionError({
                    type: 'folder_creation_failed',
                    message: 'Wrike did not return the newly created folder.'
                });
            }
            folderId = createdFolder.id;
            folderWasCreated = true;
        }

        const taskParams: Record<string, string> = { title: input.taskTitle };
        if (input.taskDescription !== undefined) {
            taskParams['description'] = input.taskDescription;
        }
        if (input.taskStatus !== undefined) {
            taskParams['status'] = input.taskStatus;
        }
        if (input.taskImportance !== undefined) {
            taskParams['importance'] = input.taskImportance;
        }
        if (input.taskDates !== undefined) {
            taskParams['dates'] = JSON.stringify(input.taskDates);
        }
        if (input.taskResponsibles !== undefined) {
            taskParams['responsibles'] = JSON.stringify(input.taskResponsibles);
        }
        if (input.taskFollowers !== undefined) {
            taskParams['followers'] = JSON.stringify(input.taskFollowers);
        }
        if (input.taskSuperTasks !== undefined) {
            taskParams['superTasks'] = JSON.stringify(input.taskSuperTasks);
        }
        if (input.taskCustomFields !== undefined) {
            taskParams['customFields'] = JSON.stringify(input.taskCustomFields);
        }
        if (input.taskCustomStatusId !== undefined) {
            taskParams['customStatus'] = input.taskCustomStatusId;
        }
        if (input.taskBillingType !== undefined) {
            taskParams['billingType'] = input.taskBillingType;
        }

        // https://developers.wrike.com/reference/postfolderssingletasks.md
        const createTaskResponse = await nango.post<unknown>({
            endpoint: `/folders/${encodeURIComponent(folderId)}/tasks`,
            params: taskParams,
            // Not idempotent: a retry after a lost response would create a duplicate task.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });
        const createdTasks = CreateTaskResponseSchema.parse(createTaskResponse.data);
        const task = createdTasks.data[0];
        if (!task) {
            throw new nango.ActionError({
                type: 'task_creation_failed',
                message: 'Wrike did not return the newly created task.',
                folder_id: folderId
            });
        }

        return {
            folderId,
            folderWasCreated,
            task: {
                id: task.id,
                ...(task.accountId != null && { accountId: task.accountId }),
                ...(task.title != null && { title: task.title }),
                ...(task.description != null && { description: task.description }),
                ...(task.status != null && { status: task.status }),
                ...(task.importance != null && { importance: task.importance }),
                ...(task.createdDate != null && { createdDate: task.createdDate }),
                ...(task.updatedDate != null && { updatedDate: task.updatedDate }),
                ...(task.completedDate != null && { completedDate: task.completedDate }),
                ...(task.scope != null && { scope: task.scope }),
                ...(task.permalink != null && { permalink: task.permalink }),
                ...(task.parentIds != null && { parentIds: task.parentIds }),
                ...(task.responsibleIds != null && { responsibleIds: task.responsibleIds }),
                ...(task.superTaskIds != null && { superTaskIds: task.superTaskIds }),
                ...(task.subTaskIds != null && { subTaskIds: task.subTaskIds }),
                ...(task.customStatusId != null && { customStatusId: task.customStatusId })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
