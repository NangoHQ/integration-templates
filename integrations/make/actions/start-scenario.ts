import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021')
});

const ProviderScenarioSchema = z.object({
    id: z.number(),
    islinked: z.boolean(),
    isActive: z.boolean()
});

const ProviderResponseSchema = z.object({
    scenario: ProviderScenarioSchema
});

const OutputSchema = z.object({
    scenario: z.object({
        id: z.number(),
        islinked: z.boolean(),
        isActive: z.boolean()
    })
});

const action = createAction({
    description: 'Activate (turn on) a scenario so it can run on its schedule or trigger.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}/start`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            scenario: {
                id: providerData.scenario.id,
                islinked: providerData.scenario.islinked,
                isActive: providerData.scenario.isActive
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
