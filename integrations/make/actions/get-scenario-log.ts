import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021'),
    executionId: z.string().describe('Execution ID. Example: "e0839e2109764dc8908187a6b42b8363"')
});

const ProviderErrorSchema = z
    .object({
        name: z.string(),
        message: z.string()
    })
    .optional();

const ProviderScenarioLogSchema = z.object({
    scenarioLog: z.object({
        imtId: z.string(),
        eventType: z.string().optional(),
        id: z.string(),
        timestamp: z.string(),
        type: z.string(),
        instant: z.boolean(),
        authorId: z.number().optional(),
        authorName: z.string().nullable().optional(),
        teamId: z.number(),
        organizationId: z.number(),
        scenarioId: z.number().optional(),
        scenarioName: z.string().optional(),
        duration: z.number().optional(),
        operations: z.number().optional(),
        transfer: z.number().optional(),
        centicredits: z.number().optional(),
        status: z.number().optional(),
        error: ProviderErrorSchema,
        isReplayable: z.boolean().optional(),
        replayOfExecutionId: z.string().nullable().optional(),
        replayOfExecutionName: z.string().nullable().optional(),
        replayOfExecutionTimestamp: z.string().nullable().optional()
    })
});

const OutputSchema = z.object({
    imtId: z.string(),
    id: z.string(),
    eventType: z.string().optional(),
    timestamp: z.string(),
    type: z.string(),
    instant: z.boolean(),
    authorId: z.number().optional(),
    authorName: z.string().optional(),
    teamId: z.number(),
    organizationId: z.number(),
    scenarioId: z.number().optional(),
    scenarioName: z.string().optional(),
    duration: z.number().optional(),
    operations: z.number().optional(),
    transfer: z.number().optional(),
    centicredits: z.number().optional(),
    status: z.number().optional(),
    error: z.object({ name: z.string(), message: z.string() }).optional(),
    isReplayable: z.boolean().optional(),
    replayOfExecutionId: z.string().optional(),
    replayOfExecutionName: z.string().optional(),
    replayOfExecutionTimestamp: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single execution log entry for a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/api-reference/scenarios/logs/get-scenario-log
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}/logs/${encodeURIComponent(input.executionId)}`,
            retries: 3
        });

        const providerLog = ProviderScenarioLogSchema.parse(response.data);
        const log = providerLog.scenarioLog;

        return {
            imtId: log.imtId,
            id: log.id,
            ...(log.eventType !== undefined && { eventType: log.eventType }),
            timestamp: log.timestamp,
            type: log.type,
            instant: log.instant,
            ...(log.authorId !== undefined && { authorId: log.authorId }),
            ...(log.authorName != null && { authorName: log.authorName }),
            teamId: log.teamId,
            organizationId: log.organizationId,
            ...(log.scenarioId !== undefined && { scenarioId: log.scenarioId }),
            ...(log.scenarioName !== undefined && { scenarioName: log.scenarioName }),
            ...(log.duration !== undefined && { duration: log.duration }),
            ...(log.operations !== undefined && { operations: log.operations }),
            ...(log.transfer !== undefined && { transfer: log.transfer }),
            ...(log.centicredits !== undefined && { centicredits: log.centicredits }),
            ...(log.status !== undefined && { status: log.status }),
            ...(log.error !== undefined && { error: log.error }),
            ...(log.isReplayable !== undefined && { isReplayable: log.isReplayable }),
            ...(log.replayOfExecutionId != null && { replayOfExecutionId: log.replayOfExecutionId }),
            ...(log.replayOfExecutionName != null && { replayOfExecutionName: log.replayOfExecutionName }),
            ...(log.replayOfExecutionTimestamp != null && { replayOfExecutionTimestamp: log.replayOfExecutionTimestamp })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
