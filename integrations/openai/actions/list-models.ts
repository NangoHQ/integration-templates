import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input parameters required for listing models
});

const ProviderModelSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string()
});

const ProviderResponseSchema = z.object({
    object: z.string(),
    data: z.array(ProviderModelSchema)
});

const ModelSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string()
});

const OutputSchema = z.object({
    models: z.array(ModelSchema)
});

const action = createAction({
    description: 'List all models available to the authenticated organization',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-models',
        group: 'Models'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/models/list
        const response = await nango.get({
            endpoint: '/v1/models',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            models: providerData.data.map((model) => ({
                id: model.id,
                object: model.object,
                created: model.created,
                owned_by: model.owned_by
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
