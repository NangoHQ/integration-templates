import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413021')
});

const ProviderResponseSchema = z.object({
    scenario: z.object({
        id: z.number(),
        islinked: z.boolean(),
        isActive: z.boolean()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    islinked: z.boolean(),
    isActive: z.boolean()
});

const action = createAction({
    description: 'Deactivate (turn off) a running scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}/stop`,
            retries: 3
        };

        const response = await nango.post(config);

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.scenario.id,
            islinked: providerData.scenario.islinked,
            isActive: providerData.scenario.isActive
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
