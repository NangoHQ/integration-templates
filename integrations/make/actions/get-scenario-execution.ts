import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario. Example: 6413021'),
    executionId: z.string().describe('The unique ID of the scenario execution. Example: "8383f2871d634888a4debe8cdf444aa2"')
});

const CauseModuleSchema = z.object({
    name: z.string().optional(),
    appName: z.string().optional()
});

const ErrorDetailSchema = z.object({
    name: z.string().optional(),
    message: z.string().optional(),
    causeModule: CauseModuleSchema.optional()
});

const OutputSchema = z.object({
    status: z.string().describe('Status of the scenario execution: RUNNING, SUCCESS, WARNING, ERROR'),
    outputs: z.record(z.string(), z.unknown()).optional(),
    error: ErrorDetailSchema.optional()
});

const action = createAction({
    description: 'Retrieve the status and result of a single scenario execution.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const scenarioId = encodeURIComponent(String(input.scenarioId));
        const executionId = encodeURIComponent(input.executionId);

        const response = await nango.get({
            // https://developers.make.com/api-documentation/scenarios/logs/get-scenario-execution-details
            endpoint: `/scenarios/${scenarioId}/executions/${executionId}`,
            retries: 3
        });

        const raw = response.data;

        if (typeof raw !== 'object' || raw === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned a non-object response.'
            });
        }

        const providerResponse = OutputSchema.parse(raw);

        return {
            status: providerResponse.status,
            ...(providerResponse.outputs !== undefined && { outputs: providerResponse.outputs }),
            ...(providerResponse.error !== undefined && { error: providerResponse.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
