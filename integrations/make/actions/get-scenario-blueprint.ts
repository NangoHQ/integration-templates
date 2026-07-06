import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario. Example: 6413021')
});

const BlueprintSchema = z.object({
    flow: z.array(z.record(z.string(), z.unknown())),
    name: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    blueprint: BlueprintSchema,
    scheduling: z.record(z.string(), z.unknown()).optional(),
    idSequence: z.number().optional(),
    created: z.string().optional(),
    last_edit: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the current blueprint (flow definition) of a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/api-reference/scenarios/blueprints.md
            endpoint: `/scenarios/${encodeURIComponent(input.scenarioId)}/blueprint`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Scenario blueprint not found',
                scenarioId: input.scenarioId
            });
        }

        const ProviderResponseSchema = z.object({
            code: z.string(),
            response: OutputSchema
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return parsed.response;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
