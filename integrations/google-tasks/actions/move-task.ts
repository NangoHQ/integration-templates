import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        taskListId: z
            .string()
            .describe(
                'Identifier of the task list that currently contains the task. Use "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        taskId: z.string().describe('Identifier of the task to move. Example: "Nng3cXVvc0ZvRGlCZVNmRA"'),
        parent: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Identifier of the new parent task. Omit or pass null to move the task to the top level. Must be an existing, non-hidden task in the same list. Example: "dl85dnNkNF9XNlprcTNaZA"'
            ),
        previous: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Identifier of the new previous sibling task; the moved task is placed immediately after it. Omit or pass null to move it to the first position among its siblings. Must be an existing, non-hidden task in the same list. Example: "dl85dnNkNF9XNlprcTNaZA"'
            ),
        destinationTasklist: z
            .string()
            .optional()
            .describe(
                'Identifier of a different task list to move the task into. Omit to move the task within its current list. Example: "TVhPREw3WDBsYkJGUlVpMg"'
            )
    })
    .describe('Identifies the task to move and the target parent, sibling position, and/or destination list.');

const TaskSchema = z.object({
    kind: z.string().optional().describe('Resource type; always "tasks#task".'),
    id: z.string().describe('Task identifier.'),
    etag: z.string().optional().describe('ETag of the task resource.'),
    title: z.string().optional().describe('Title of the task.'),
    updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp.'),
    selfLink: z.string().optional().describe('URL pointing to this task; reflects the destination list after a cross-list move.'),
    parent: z.string().optional().describe('Parent task identifier; omitted for top-level tasks.'),
    position: z.string().optional().describe('Lexicographic position of the task among its sibling tasks under the same parent or at the top level.'),
    notes: z.string().optional().describe('Notes describing the task.'),
    status: z.string().optional().describe('Status of the task: "needsAction" or "completed".'),
    due: z.string().optional().describe('Due date of the task as an RFC 3339 timestamp (date portion only).'),
    completed: z.string().optional().describe('Completion time of the task as an RFC 3339 timestamp; omitted when the task is not completed.'),
    deleted: z.boolean().optional().describe('Whether the task has been deleted.'),
    hidden: z.boolean().optional().describe('Whether the task is hidden, which happens when it was completed before the task list was last cleared.'),
    links: z
        .array(
            z.object({
                type: z.string().optional().describe('Type of the link, e.g. "email", "generic", "chat_message", "keep_note".'),
                description: z.string().optional().describe('Description of the link (may be empty).'),
                link: z.string().optional().describe('URL of the link.')
            })
        )
        .optional()
        .describe('Read-only collection of links associated with the task.'),
    webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
    assignmentInfo: z
        .object({
            linkToTask: z.string().optional().describe('Absolute link to the original task in the surface where it was assigned.'),
            surfaceType: z.string().optional().describe('Type of surface the assigned task originates from, e.g. "DOCUMENT" or "SPACE".'),
            driveResourceInfo: z
                .object({
                    driveFileId: z.string().optional().describe('Identifier of the file in the Drive API.'),
                    resourceKey: z.string().optional().describe('Resource key required to access files shared via a shared link.')
                })
                .optional()
                .describe('Drive file information when the task was assigned from a document.'),
            spaceInfo: z
                .object({
                    space: z.string().optional().describe('Chat space where the task originates, formatted as "spaces/{space}".')
                })
                .optional()
                .describe('Chat space information when the task was assigned from a space.')
        })
        .optional()
        .describe('Read-only context information for tasks assigned from surfaces such as Docs or Chat Spaces.')
});

const OutputSchema = TaskSchema.describe('The moved task returned by the provider, reflecting its new list, parent, and position.');

/**
 * @tags: [write]
 * @tagReason: Mutates a task by changing its parent, sibling position, and/or task list; no provider data is deleted.
 * @pitfalls: Omitting `parent` promotes the task to the top level instead of keeping its current parent, and omitting `previous` moves it to the first sibling position; a cross-list move updates the task's `selfLink` and the original list no longer returns it; `parent` and `previous` must be existing, non-hidden tasks in the list, and repeating tasks cannot be moved between lists.
 */
const action = createAction({
    description: 'Move a task to a new parent and/or sibling position within the same list, or to a different task list entirely.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.parent != null) {
            params['parent'] = input.parent;
        }
        if (input.previous != null) {
            params['previous'] = input.previous;
        }
        if (input.destinationTasklist != null) {
            params['destinationTasklist'] = input.destinationTasklist;
        }

        const response = await nango.post({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/move
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.taskListId)}/tasks/${encodeURIComponent(input.taskId)}/move`,
            params,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- move is not idempotent across lists; a retry after a lost response would fail or repeat the mutation
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
