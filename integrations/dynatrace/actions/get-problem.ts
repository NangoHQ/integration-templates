import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('The unique ID of the problem to retrieve. Example: "-1234567890"')
});

const EntitySchema = z
    .object({
        entityId: z.object({
            id: z.string().describe('Dynatrace entity ID'),
            type: z.string().describe('Entity type')
        }),
        name: z.string().optional().describe('Human-readable name')
    })
    .passthrough();

const ProblemSchema = z
    .object({
        problemId: z.string(),
        displayId: z.string().optional(),
        title: z.string(),
        impactLevel: z.string().optional(),
        severityLevel: z.string().optional(),
        status: z.string(),
        affectedEntities: z.array(EntitySchema).optional(),
        impactedEntities: z.array(EntitySchema).optional(),
        rootCauseEntity: EntitySchema.nullable().optional(),
        managementZones: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).optional(),
        startTime: z.number().optional(),
        endTime: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProblemSchema;

const action = createAction({
    description: 'Get full details of a single problem.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/get-problem
        const response = await nango.get({
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Problem not found or unexpected response format',
                problemId: input.problemId
            });
        }

        const problem = ProblemSchema.parse(response.data);
        return problem;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
