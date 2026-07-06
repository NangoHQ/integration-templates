import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('Scenario ID. Example: 6413024')
});

const ProviderDeleteResponseSchema = z.object({
    scenario: z.number()
});

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/api-reference/scenarios.md
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}`,
            retries: 10
        };

        const response = await nango.delete(config);

        const providerDeleteResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            id: providerDeleteResponse.scenario,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
