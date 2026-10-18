import { z } from 'zod';
import { createAction } from 'nango';

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('Type of the link, for example "email", "generic", "chat_message", or "keep_note".'),
    description: z.string().optional().describe('Description of the link; may be an empty string.'),
    link: z.string().optional().describe('The URL of the link.')
});

const DriveResourceInfoSchema = z.object({
    driveFileId: z.string().optional().describe('Identifier of the originating file in the Drive API.'),
    resourceKey: z.string().optional().describe('Resource key required to access files shared via a shared link.')
});

const SpaceInfoSchema = z.object({
    space: z.string().optional().describe('The Chat space the task originates from, formatted as "spaces/{space}".')
});

const AssignmentInfoSchema = z.object({
    linkToTask: z.string().optional().describe('Absolute link to the original task in the surface it was assigned from.'),
    surfaceType: z.string().optional().describe('Type of surface the assigned task originates from, for example "DOCUMENT" or "SPACE".'),
    driveResourceInfo: DriveResourceInfoSchema.optional().describe('Information about the Drive file the task originates from.'),
    spaceInfo: SpaceInfoSchema.optional().describe('Information about the Chat space the task originates from.')
});

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier. Use "@default" to target the primary task list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        task: z.string().describe('Identifier of the task to mark as completed. Example: "LWlneng5SFhnU2IyN2h4Qg"')
    })
    .describe('Identifies the task to mark as completed.');

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Resource type; always "tasks#task".'),
        id: z.string().describe('Task identifier.'),
        etag: z.string().optional().describe('ETag of the task resource.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp.'),
        selfLink: z.string().optional().describe('URL that points to this task.'),
        parent: z.string().optional().describe('Identifier of the parent task; omitted for top-level tasks.'),
        position: z.string().optional().describe('Lexicographic position of the task among its siblings.'),
        notes: z.string().optional().describe('Notes describing the task.'),
        status: z.string().optional().describe('Task status, either "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task as an RFC 3339 timestamp; the time portion is discarded by the provider.'),
        completed: z.string().optional().describe('Completion date of the task as an RFC 3339 timestamp; present once the task is completed.'),
        deleted: z.boolean().optional().describe('Whether the task has been deleted.'),
        hidden: z.boolean().optional().describe('Whether the task is hidden because its list was cleared after it was completed.'),
        links: z.array(TaskLinkSchema).optional().describe('Collection of links attached to the task.'),
        webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
        assignmentInfo: AssignmentInfoSchema.optional().describe('Context information for tasks assigned from surfaces such as Docs or Chat spaces.')
    })
    .describe('The task resource returned after it was marked as completed.');

/**
 * @tags: [write]
 * @tagReason: Marks the task as completed by patching its status on the provider; it does not read or delete provider data.
 * @pitfalls: Completing a parent task also auto-completes all of its subtasks; re-completing an already-completed task succeeds but leaves its original completion timestamp unchanged.
 */
const action = createAction({
    description: 'Mark a task as completed. NOTE: if this task has subtasks, they are auto-completed too - see comments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
        const response = await nango.patch({
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                status: 'completed'
            },
            // Setting an absolute status is idempotent: repeating the request leaves the task completed.
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
