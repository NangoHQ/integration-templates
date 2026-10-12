import { z } from 'zod';
import { createAction } from 'nango';

const DependencyRelationTypeSchema = z.enum(['FinishToFinish', 'StartToStart', 'StartToFinish', 'FinishToStart']);

const InputSchema = z
    .object({
        predecessorTaskId: z.string().describe('ID of the predecessor task, i.e. the task that must start or finish first. Example: "MAAAAAEQ_HoO"'),
        successorTaskId: z.string().describe('ID of the successor task, i.e. the dependent task. Example: "MAAAAAEQ_HoM"'),
        relationType: DependencyRelationTypeSchema.optional().describe(
            'Relationship between the two tasks. Defaults to "FinishToStart" (the successor cannot start until the predecessor finishes).'
        ),
        lagTime: z.number().optional().describe('Delay between the tasks in minutes. Positive values are lag time, negative values are lead time. Example: 0')
    })
    .describe('Input for creating a predecessor/successor dependency link between two Wrike tasks.');

const ProviderDependencySchema = z.object({
    id: z.string(),
    predecessorId: z.string(),
    successorId: z.string(),
    relationType: z.string(),
    lagTime: z.number()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderDependencySchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created dependency. Example: "MgAAAAEQ_HoOMwAAAAEQ_HoM"'),
        predecessorId: z.string().describe('ID of the predecessor task.'),
        successorId: z.string().describe('ID of the successor task.'),
        relationType: z.string().describe('Dependency relation type. One of "FinishToFinish", "StartToStart", "StartToFinish", "FinishToStart".'),
        lagTime: z.number().describe('Lag or lead time in minutes. Positive numbers are lag time and negative numbers are lead time.')
    })
    .describe('The dependency link created between the predecessor and successor tasks.');

/**
 * @tags: [write]
 * @tagReason: Creates a new predecessor/successor dependency link between two tasks in Wrike.
 * @pitfalls: Both tasks must already have a scheduled dates.type of "Planned" (or "Milestone" for the predecessor), so tasks left at the default "Backlog" scheduling type are rejected, and creating a dependency that already exists returns an error.
 */
const action = createAction({
    description: 'Create a predecessor/successor dependency link between two tasks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.wrike.com/reference/posttaskssingledependencies
            endpoint: `/tasks/${encodeURIComponent(input.predecessorTaskId)}/dependencies`,
            data: {
                relationType: input.relationType ?? 'FinishToStart',
                successorId: input.successorTaskId,
                ...(input.lagTime !== undefined && { lagTime: input.lagTime })
            },
            // Creating a dependency is not idempotent: a retry after a lost response would try to recreate the same link, which the provider rejects.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const dependency = parsed.data[0];

        if (!dependency) {
            throw new nango.ActionError({
                type: 'not_created',
                message: 'Wrike did not return the created dependency.'
            });
        }

        return {
            id: dependency.id,
            predecessorId: dependency.predecessorId,
            successorId: dependency.successorId,
            relationType: dependency.relationType,
            lagTime: dependency.lagTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
