import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario to run. Example: 6413022'),
    data: z.record(z.string(), z.unknown()).optional().describe('Input data for the scenario if it requires inputs.')
});

const RunResponseSchema = z.object({
    executionId: z.string(),
    statusUrl: z.string().optional()
});

const ExecutionStatusSchema = z.object({
    status: z.string(),
    outputs: z.record(z.string(), z.unknown()).optional(),
    error: z
        .object({
            name: z.string().optional(),
            message: z.string().optional(),
            causeModule: z
                .object({
                    name: z.string().optional(),
                    appName: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    executionId: z.string(),
    status: z.string(),
    outputs: z.record(z.string(), z.unknown()).optional(),
    error: z
        .object({
            name: z.string().optional(),
            message: z.string().optional(),
            causeModule: z
                .object({
                    name: z.string().optional(),
                    appName: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Manually execute an active scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:run'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/scenarios/run-scenario
        const runResponse = await nango.post({
            endpoint: `/scenarios/${encodeURIComponent(input.scenarioId)}/run`,
            data: {
                ...(input.data !== undefined && { data: input.data }),
                responsive: false
            },
            retries: 10
        });

        const runData = RunResponseSchema.parse(runResponse.data);
        const executionId = runData.executionId;
        const scenarioId = input.scenarioId;

        let pollResult: z.infer<typeof ExecutionStatusSchema> | null = null;
        const maxAttempts = 10;

        // Allow a short delay before the first poll so the execution is registered.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        for (let i = 0; i < maxAttempts; i++) {
            // https://developers.make.com/api-documentation/api-reference/scenarios/get-scenario-execution
            const pollResponse = await nango.get({
                endpoint: `/scenarios/${encodeURIComponent(scenarioId)}/executions/${encodeURIComponent(executionId)}`,
                retries: 3
            });

            pollResult = ExecutionStatusSchema.parse(pollResponse.data);

            if (pollResult.status !== 'RUNNING') {
                break;
            }

            if (i < maxAttempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }

        if (pollResult === null) {
            throw new Error('Failed to retrieve execution status after polling.');
        }

        return {
            executionId,
            status: pollResult.status,
            ...(pollResult.outputs !== undefined && { outputs: pollResult.outputs }),
            ...(pollResult.error !== undefined && { error: pollResult.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
