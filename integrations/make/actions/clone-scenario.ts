import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('ID of the scenario to clone. Example: 6413022'),
    organizationId: z.number().describe('Organization ID for the query param. Example: 8242280'),
    teamId: z.number().describe('Destination team ID. Example: 2066772'),
    name: z.string().describe('Name for the cloned scenario.'),
    states: z.record(z.string(), z.unknown()).describe('Scenario states; can be an empty object {}.')
});

const ScenarioSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        teamId: z.number().optional(),
        organizationId: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    scenario: ScenarioSchema
});

const action = createAction({
    description: 'Duplicate a scenario into the same or a different team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read', 'scenarios:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/scenarios/post-scenarios-scenarioid-clone
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}/clone`,
            params: {
                organizationId: input.organizationId
            },
            data: {
                teamId: input.teamId,
                name: input.name,
                states: input.states
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                scenario: z.unknown()
            })
            .parse(response.data);

        const scenario = ScenarioSchema.parse(providerResponse.scenario);

        return {
            scenario
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
