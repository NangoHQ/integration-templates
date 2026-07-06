import { z } from 'zod';
import { createAction } from 'nango';

const BlueprintSchema = z.object({}).passthrough();

const SchedulingSchema = z
    .object({
        type: z.string(),
        interval: z.number().optional()
    })
    .passthrough();

const InputSchema = z.object({
    teamId: z.number().describe('The unique ID of the team in which the scenario will be created. Example: 2066772'),
    blueprint: BlueprintSchema.describe('The scenario blueprint as an object. It will be JSON-encoded before sending.'),
    scheduling: SchedulingSchema.describe('The scenario scheduling details as an object. It will be JSON-encoded before sending.'),
    folderId: z.number().optional().describe('The unique ID of the folder in which to store the created scenario.'),
    basedon: z.number().optional().describe('Defines if the scenario is created based on a template. The value is the template ID.')
});

const ScenarioSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        teamId: z.number().nullable().optional(),
        hookId: z.number().nullable().optional(),
        description: z.string().nullable().optional(),
        folderId: z.number().nullable().optional(),
        isinvalid: z.boolean().nullable().optional(),
        isActive: z.boolean().nullable().optional(),
        islocked: z.boolean().nullable().optional(),
        isPaused: z.boolean().nullable().optional(),
        usedPackages: z.array(z.string()).nullable().optional(),
        lastEdit: z.string().nullable().optional(),
        scheduling: z
            .object({
                type: z.string().nullable().optional(),
                interval: z.number().nullable().optional()
            })
            .nullable()
            .optional(),
        created: z.string().nullable().optional(),
        scenarioVersion: z.number().nullable().optional(),
        type: z.enum(['scenario', 'tool']).nullable().optional(),
        deleted: z.boolean().nullable().optional(),
        deletedAt: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    scenario: ScenarioSchema
});

const action = createAction({
    description: 'Create a new scenario from a blueprint.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/api-reference/scenarios/post-scenarios
            endpoint: '/scenarios',
            data: {
                teamId: input.teamId,
                blueprint: JSON.stringify(input.blueprint),
                scheduling: JSON.stringify(input.scheduling),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.basedon !== undefined && { basedon: input.basedon })
            },
            retries: 10
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new Error('Invalid response from Make API: expected object');
        }

        const scenario = rawData.scenario;
        if (!scenario || typeof scenario !== 'object') {
            throw new Error('Invalid response from Make API: missing scenario object');
        }

        const parsedScenario = ScenarioSchema.parse(scenario);

        return {
            scenario: parsedScenario
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
