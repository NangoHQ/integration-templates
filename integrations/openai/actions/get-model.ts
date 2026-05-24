import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Model ID. Example: "gpt-4o-mini"')
});

const ProviderModelSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string()
});

const action = createAction({
    description: 'Retrieve a single model from OpenAI.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-model',
        group: 'Models'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/models/retrieve
        const response = await nango.get({
            endpoint: `/v1/models/${encodeURIComponent(input.model)}`,
            retries: 3
        });

        const providerModel = ProviderModelSchema.parse(response.data);

        return {
            id: providerModel.id,
            object: providerModel.object,
            created: providerModel.created,
            owned_by: providerModel.owned_by
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
