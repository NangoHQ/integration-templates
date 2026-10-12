import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const DependencySchema = z.object({
    id: z.string().describe('Unique dependency ID. Example: "MgAAAAEQ_HoOMwAAAAEQ_HoM"'),
    predecessorId: z.string().describe('Task ID of the predecessor (the task that must come first).'),
    successorId: z.string().describe('Task ID of the successor (the task that follows).'),
    relationType: z.enum(['FinishToFinish', 'StartToStart', 'StartToFinish', 'FinishToStart']).describe('Dependency relationship type.'),
    lagTime: z.number().describe('Lag (positive) or lead (negative) time in minutes. Project dependencies are always a multiple of 480.')
});

const InputSchema = z
    .object({
        taskId: z.string().describe('Wrike task ID whose dependencies should be listed. Example: "MAAAAAEQ_HoO"')
    })
    .describe('Input for listing the dependency relationships of a Wrike task.');

const OutputSchema = z
    .object({
        dependencies: z.array(DependencySchema).describe('Dependency relationships involving the task, in either direction.')
    })
    .describe('Dependency relationships involving the requested Wrike task.');

/**
 * @tags: [read]
 * @tagReason: Reads dependency relationships from the provider without mutating any resource.
 * @pitfalls: Returns dependencies in both directions (the task may appear as predecessor or successor), so filter by predecessorId/successorId for one direction; lagTime is in minutes and is negative for lead time (project dependencies use multiples of 480).
 */
const action = createAction({
    description: 'List the dependency relationships (predecessor/successor links) involving a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.wrike.com/reference/gettaskssingledependencies
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/dependencies`,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = z
            .object({
                kind: z.string().optional(),
                data: z.array(DependencySchema).optional()
            })
            .parse(response.data);

        return {
            dependencies: parsed.data ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
