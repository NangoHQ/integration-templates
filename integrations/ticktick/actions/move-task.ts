import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        fromProjectId: z.string().describe('ID of the source project that currently contains the tasks to move. Example: "6ac94f5f8f089f376a2585c2".'),
        toProjectId: z.string().describe('ID of the destination project the tasks are moved into. Example: "6ac94f5f8f084dbfaa69ead8".'),
        taskIds: z
            .array(z.string())
            .min(1)
            .describe('IDs of one or more tasks to move from the source project to the destination project. Example: ["6ac94f658f0879728388db64"].')
    })
    .describe('Input for moving one or more tasks from a single source project to a single destination project.');

const ProviderMoveResultSchema = z.object({
    id: z.string(),
    etag: z.string().optional(),
    modifiedTime: z.string().optional()
});

const OutputSchema = z
    .object({
        movedTasks: z
            .array(
                z.object({
                    id: z.string().describe('ID of the task the provider reported a move result for.'),
                    etag: z.string().optional().describe('New etag of the task after the move.'),
                    modifiedTime: z
                        .string()
                        .optional()
                        .describe('Timestamp when the move was recorded, in ISO-8601 format. Example: "2026-10-09T20:32:44.387+0000".')
                })
            )
            .describe(
                'Move results exactly as returned by TickTick. Empty when either project does not exist, so do not rely on its length or order matching the requested taskIds.'
            )
    })
    .describe('Result of the move operation, listing the tasks the provider returned a result for.');

/**
 * @tags: [write]
 * @tagReason: Moves tasks between projects, mutating each task's project assignment on the provider.
 * @pitfalls: An empty result does not mean "nothing moved" - it is returned when the source or destination project does not exist, while task IDs that do not exist still get a result entry, so the output alone never confirms a task actually moved. The provider also rate-limits at 100 requests per minute, failing with HTTP 500 and errorCode "exceed_query_limit".
 */
const action = createAction({
    description: 'Move one or more tasks from one project to another in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = input.taskIds.map((taskId) => ({
            fromProjectId: input.fromProjectId,
            toProjectId: input.toProjectId,
            taskId
        }));

        const response = await nango.post<unknown>({
            // https://developer.ticktick.com/docs/openapi.md (Move Task)
            endpoint: '/open/v1/task/move',
            data: body,
            // Move is idempotent: the destination project is absolute, so a retry after a lost response cannot duplicate or corrupt state.
            retries: 3
        });

        const results = z.array(ProviderMoveResultSchema).parse(response.data);

        return {
            movedTasks: results.map((result) => ({
                id: result.id,
                ...(result.etag !== undefined && { etag: result.etag }),
                ...(result.modifiedTime !== undefined && { modifiedTime: result.modifiedTime })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
