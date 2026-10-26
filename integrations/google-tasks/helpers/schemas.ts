import { z } from 'zod';

// Raw provider schemas. Google Tasks omits unset fields; `.nullish()` also tolerates explicit nulls.

export const ProviderTaskLinkSchema = z.object({
    type: z.string().nullish(),
    description: z.string().nullish(),
    link: z.string().nullish()
});

export const ProviderAssignmentInfoSchema = z.object({
    linkToTask: z.string().nullish(),
    surfaceType: z.string().nullish(),
    driveResourceInfo: z
        .object({
            driveFileId: z.string().nullish(),
            resourceKey: z.string().nullish()
        })
        .nullish(),
    spaceInfo: z
        .object({
            space: z.string().nullish()
        })
        .nullish()
});

export const ProviderTaskSchema = z.object({
    kind: z.string().nullish(),
    id: z.string(),
    etag: z.string().nullish(),
    title: z.string().nullish(),
    updated: z.string().nullish(),
    selfLink: z.string().nullish(),
    parent: z.string().nullish(),
    position: z.string().nullish(),
    notes: z.string().nullish(),
    status: z.string().nullish(),
    due: z.string().nullish(),
    completed: z.string().nullish(),
    deleted: z.boolean().nullish(),
    hidden: z.boolean().nullish(),
    links: z.array(ProviderTaskLinkSchema).nullish(),
    webViewLink: z.string().nullish(),
    assignmentInfo: ProviderAssignmentInfoSchema.nullish()
});

export const ProviderTaskListSchema = z.object({
    kind: z.string().nullish(),
    id: z.string(),
    etag: z.string().nullish(),
    title: z.string().nullish(),
    updated: z.string().nullish(),
    selfLink: z.string().nullish()
});

// Normalized output schemas shared by every action and sync of the integration.

export const TaskLinkSchema = z
    .object({
        type: z.string().optional().describe('Type of the link, for example "email", "generic", "chat_message", or "keep_note".'),
        description: z.string().optional().describe('Description of the link; may be an empty string.'),
        link: z.string().optional().describe('The URL of the link.')
    })
    .describe('A read-only link attached to a task.');

export const AssignmentInfoSchema = z
    .object({
        linkToTask: z.string().optional().describe('Absolute link to the original task in the surface it was assigned from.'),
        surfaceType: z.string().optional().describe('Type of surface the assigned task originates from, for example "DOCUMENT" or "SPACE".'),
        driveResourceInfo: z
            .object({
                driveFileId: z.string().optional().describe('Identifier of the originating file in the Drive API.'),
                resourceKey: z.string().optional().describe('Resource key required to access files shared via a shared link.')
            })
            .optional()
            .describe('Information about the Drive file the task originates from.'),
        spaceInfo: z
            .object({
                space: z.string().optional().describe('The Chat space the task originates from, formatted as "spaces/{space}".')
            })
            .optional()
            .describe('Information about the Chat space the task originates from.')
    })
    .describe('Context for a task assigned to the user from Docs or Chat Spaces.');

export const TaskSchema = z
    .object({
        kind: z.string().optional().describe('Resource type; always "tasks#task".'),
        id: z.string().describe('Task identifier. Task ids are globally unique and survive a move to another task list. Example: "LWlneng5SFhnU2IyN2h4Qg"'),
        etag: z.string().optional().describe('ETag of the task resource; changes whenever the task is modified.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp. Example: "2026-10-15T16:24:29.043Z"'),
        selfLink: z.string().optional().describe('URL that points to this task.'),
        parent: z.string().optional().describe('Identifier of the parent task; omitted for top-level tasks.'),
        position: z.string().optional().describe('Lexicographic position of the task among its siblings.'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        status: z.string().optional().describe('Task status, either "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date as an RFC 3339 timestamp; only the date portion is stored. Example: "2026-12-31T00:00:00.000Z"'),
        completed: z.string().optional().describe('Completion time as an RFC 3339 timestamp; present only once the task is completed.'),
        deleted: z.boolean().optional().describe('True when the task has been deleted; deleted tasks are returned as tombstones rather than 404.'),
        hidden: z.boolean().optional().describe('True when the task is hidden because it was completed before its list was last cleared.'),
        links: z.array(TaskLinkSchema).optional().describe('Read-only collection of links attached to the task.'),
        webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
        assignmentInfo: AssignmentInfoSchema.optional().describe('Context for tasks assigned from surfaces such as Docs or Chat Spaces.')
    })
    .describe('A Google Tasks task.');

export const TaskListSchema = z
    .object({
        kind: z.string().optional().describe('Resource type; always "tasks#taskList".'),
        id: z.string().describe('Task list identifier. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        etag: z.string().optional().describe('ETag of the task list; changes whenever the list is modified.'),
        title: z.string().optional().describe('Title of the task list. Example: "My Tasks"'),
        updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp. Example: "2025-11-11T21:17:21.284Z"'),
        selfLink: z.string().optional().describe('URL that points to this task list.')
    })
    .describe('A Google Tasks task list.');

export type ProviderTask = z.infer<typeof ProviderTaskSchema>;
export type ProviderTaskList = z.infer<typeof ProviderTaskListSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;

function toAssignmentInfo(info: z.infer<typeof ProviderAssignmentInfoSchema>): z.infer<typeof AssignmentInfoSchema> {
    return {
        ...(info.linkToTask != null && { linkToTask: info.linkToTask }),
        ...(info.surfaceType != null && { surfaceType: info.surfaceType }),
        ...(info.driveResourceInfo != null && {
            driveResourceInfo: {
                ...(info.driveResourceInfo.driveFileId != null && { driveFileId: info.driveResourceInfo.driveFileId }),
                ...(info.driveResourceInfo.resourceKey != null && { resourceKey: info.driveResourceInfo.resourceKey })
            }
        }),
        ...(info.spaceInfo != null && {
            spaceInfo: {
                ...(info.spaceInfo.space != null && { space: info.spaceInfo.space })
            }
        })
    };
}

/** Normalize a raw provider task into the shared output shape, dropping null/omitted fields. */
export function toTask(task: ProviderTask): Task {
    return {
        ...(task.kind != null && { kind: task.kind }),
        id: task.id,
        ...(task.etag != null && { etag: task.etag }),
        ...(task.title != null && { title: task.title }),
        ...(task.updated != null && { updated: task.updated }),
        ...(task.selfLink != null && { selfLink: task.selfLink }),
        ...(task.parent != null && { parent: task.parent }),
        ...(task.position != null && { position: task.position }),
        ...(task.notes != null && { notes: task.notes }),
        ...(task.status != null && { status: task.status }),
        ...(task.due != null && { due: task.due }),
        ...(task.completed != null && { completed: task.completed }),
        ...(task.deleted != null && { deleted: task.deleted }),
        ...(task.hidden != null && { hidden: task.hidden }),
        ...(task.links != null && {
            links: task.links.map((link) => ({
                ...(link.type != null && { type: link.type }),
                ...(link.description != null && { description: link.description }),
                ...(link.link != null && { link: link.link })
            }))
        }),
        ...(task.webViewLink != null && { webViewLink: task.webViewLink }),
        ...(task.assignmentInfo != null && { assignmentInfo: toAssignmentInfo(task.assignmentInfo) })
    };
}

/** Normalize a raw provider task list into the shared output shape, dropping null/omitted fields. */
export function toTaskList(taskList: ProviderTaskList): TaskList {
    return {
        ...(taskList.kind != null && { kind: taskList.kind }),
        id: taskList.id,
        ...(taskList.etag != null && { etag: taskList.etag }),
        ...(taskList.title != null && { title: taskList.title }),
        ...(taskList.updated != null && { updated: taskList.updated }),
        ...(taskList.selfLink != null && { selfLink: taskList.selfLink })
    };
}
