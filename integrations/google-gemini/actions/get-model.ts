import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Model name. Example: "gemini-2.5-flash" or "models/gemini-2.5-flash"')
});

const ProviderModelSchema = z
    .object({
        name: z.string(),
        baseModelId: z.string().optional(),
        version: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        inputTokenLimit: z.number().optional(),
        outputTokenLimit: z.number().optional(),
        supportedGenerationMethods: z.array(z.string()).optional(),
        temperature: z.number().optional(),
        maxTemperature: z.number().optional(),
        topP: z.number().optional(),
        topK: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    name: z.string(),
    baseModelId: z.string().optional(),
    version: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    inputTokenLimit: z.number().optional(),
    outputTokenLimit: z.number().optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    maxTemperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a specific Gemini model by name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const modelName = input.model.startsWith('models/') ? input.model.slice(7) : input.model;
        const encodedModelPath = modelName
            .split('/')
            .map((seg) => encodeURIComponent(seg))
            .join('/');

        const config = {
            // https://ai.google.dev/api/models#getv1betamodels
            endpoint: `/v1beta/models/${encodedModelPath}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Model not found or unexpected response'
            });
        }

        const providerModel = ProviderModelSchema.parse(response.data);

        return {
            name: providerModel.name,
            ...(providerModel.baseModelId !== undefined && { baseModelId: providerModel.baseModelId }),
            ...(providerModel.version !== undefined && { version: providerModel.version }),
            ...(providerModel.displayName !== undefined && { displayName: providerModel.displayName }),
            ...(providerModel.description !== undefined && { description: providerModel.description }),
            ...(providerModel.inputTokenLimit !== undefined && { inputTokenLimit: providerModel.inputTokenLimit }),
            ...(providerModel.outputTokenLimit !== undefined && { outputTokenLimit: providerModel.outputTokenLimit }),
            ...(providerModel.supportedGenerationMethods !== undefined && { supportedGenerationMethods: providerModel.supportedGenerationMethods }),
            ...(providerModel.temperature !== undefined && { temperature: providerModel.temperature }),
            ...(providerModel.maxTemperature !== undefined && { maxTemperature: providerModel.maxTemperature }),
            ...(providerModel.topP !== undefined && { topP: providerModel.topP }),
            ...(providerModel.topK !== undefined && { topK: providerModel.topK })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
