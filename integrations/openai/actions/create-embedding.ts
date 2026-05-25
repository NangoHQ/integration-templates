import { z } from 'zod';
import { createAction } from 'nango';

// https://platform.openai.com/docs/api-reference/embeddings/create
const InputSchema = z.object({
    model: z.string().describe('ID of the model to use. Example: "text-embedding-3-small"'),
    input: z.union([z.string(), z.array(z.string())]).describe('Input text to embed, encoded as a string or array of strings.'),
    encodingFormat: z.enum(['float', 'base64']).optional().describe('The format to return the embeddings in. Can be "float" or "base64".'),
    dimensions: z
        .number()
        .optional()
        .describe('The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models.')
});

const EmbeddingDataSchema = z.object({
    object: z.string(),
    embedding: z.array(z.number()),
    index: z.number()
});

const UsageSchema = z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number()
});

const ProviderResponseSchema = z.object({
    object: z.string(),
    data: z.array(EmbeddingDataSchema),
    model: z.string(),
    usage: UsageSchema
});

const OutputSchema = z.object({
    object: z.string(),
    data: z.array(
        z.object({
            object: z.string(),
            embedding: z.array(z.number()),
            index: z.number()
        })
    ),
    model: z.string(),
    usage: z.object({
        promptTokens: z.number(),
        totalTokens: z.number()
    })
});

const action = createAction({
    description: 'Create embeddings for text inputs.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-embedding',
        group: 'Embeddings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/embeddings/create
        const response = await nango.post({
            endpoint: '/v1/embeddings',
            data: {
                model: input.model,
                input: input.input,
                ...(input.encodingFormat !== undefined && { encoding_format: input.encodingFormat }),
                ...(input.dimensions !== undefined && { dimensions: input.dimensions })
            },
            retries: 3
        });

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'insufficient_quota',
                message: 'The API key does not have sufficient billing quota for this request.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            object: providerResponse.object,
            data: providerResponse.data.map((item) => ({
                object: item.object,
                embedding: item.embedding,
                index: item.index
            })),
            model: providerResponse.model,
            usage: {
                promptTokens: providerResponse.usage.prompt_tokens,
                totalTokens: providerResponse.usage.total_tokens
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
