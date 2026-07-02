import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario. Example: 6413021'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The maximum number of log entries to return.')
});

const ScenarioLogSchema = z.object({
    imtId: z.string(),
    duration: z.number().optional(),
    operations: z.number().optional(),
    transfer: z.number().optional(),
    centicredits: z.number().optional(),
    organizationId: z.number().optional(),
    teamId: z.number().optional(),
    id: z.union([z.number(), z.string()]),
    type: z.string(),
    authorId: z.union([z.number(), z.null()]).optional(),
    authorName: z.string().nullable().optional(),
    instant: z.boolean().optional(),
    timestamp: z.string().optional(),
    status: z.number().optional()
});

const ProviderResponseSchema = z.object({
    scenarioLogs: z.array(z.unknown()),
    pg: z
        .object({
            last: z.string().optional(),
            showLast: z.boolean().optional(),
            sortBy: z.string().optional(),
            sortDir: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    scenarioLogs: z.array(ScenarioLogSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List execution and edit history log entries for a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['pg[last]'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['pg[limit]'] = input.limit;
        }

        // https://developers.make.com/api-documentation/api-reference/scenarios/logs/get--scenarios--scenarioid--logs
        const response = await nango.get({
            endpoint: `/scenarios/${encodeURIComponent(input.scenarioId)}/logs`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const scenarioLogs = providerResponse.scenarioLogs.map((item) => ScenarioLogSchema.parse(item));

        return {
            scenarioLogs,
            ...(providerResponse.pg?.last !== undefined && { nextCursor: providerResponse.pg.last })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
