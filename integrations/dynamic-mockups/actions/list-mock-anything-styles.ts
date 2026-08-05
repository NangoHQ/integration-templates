import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().optional().describe('AI model to filter styles by. Example: "nano_banana_pro"')
});

const ProviderStyleSchema = z.object({
    id: z.string(),
    description: z.string(),
    available_with: z.array(z.string())
});

const OutputSchema = z.object({
    styles: z.array(
        z.object({
            id: z.string(),
            description: z.string(),
            available_with: z.array(z.string())
        })
    )
});

const action = createAction({
    description: 'List available AI generation styles for MockAnything, optionally filtered by model.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynamicmockups.com/
        const response = await nango.get({
            endpoint: '/v1/mock-anything/styles',
            params: {
                ...(input.model !== undefined && { model: input.model })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(ProviderStyleSchema)
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerStyles = providerResponse.data;

        return {
            styles: providerStyles.map((style) => ({
                id: style.id,
                description: style.description,
                available_with: style.available_with
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
