import { createAction } from 'nango';
import { z } from 'zod';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe(
                'Identifier of the task list that currently contains the task. Use "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        task: z.string().describe('Identifier of the task to move. Example: "Nng3cXVvc0ZvRGlCZVNmRA"'),
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

const OutputSchema = TaskSchema.describe('The moved task returned by the provider, reflecting its new list, parent, and position.');

/**
 * @tags: [write]
 * @tagReason: Mutates a task by changing its parent, sibling position, and/or task list; no provider data is deleted.
 * @pitfalls: Omitting `parent` promotes the task to the top level instead of keeping its current parent, and omitting `previous` moves it to the first sibling position; a cross-list move keeps the same task id but updates its `selfLink`, and the original list no longer returns it (not even as a deleted tombstone); `parent` and `previous` must be existing, non-hidden tasks in the list, and repeating tasks cannot be moved between lists.
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
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}/move`,
            params,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- move is not idempotent across lists; a retry after a lost response would fail or repeat the mutation
            retries: 0
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
