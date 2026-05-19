import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('The model to use for embeddings. Example: "text-embedding-3-small"'),
    input: z.union([z.string(), z.array(z.string())]).describe('The text to embed. Can be a single string or an array of strings.'),
    encoding_format: z.enum(['float', 'base64']).optional().describe('The format to return the embeddings in. Can be "float" or "base64".'),
    dimensions: z.number().optional().describe('The number of dimensions the resulting output embeddings should have.')
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
        prompt_tokens: z.number(),
        total_tokens: z.number()
    })
});

const action = createAction({
    description: 'Create embeddings for text inputs',
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
        const requestBody: {
            model: string;
            input: string | string[];
            encoding_format?: string;
            dimensions?: number;
        } = {
            model: input.model,
            input: input.input
        };

        if (input.encoding_format !== undefined) {
            requestBody.encoding_format = input.encoding_format;
        }

        if (input.dimensions !== undefined) {
            requestBody.dimensions = input.dimensions;
        }

        const response = await nango.post({
            // https://platform.openai.com/docs/api-reference/embeddings/create
            endpoint: '/v1/embeddings',
            data: requestBody,
            retries: 3
        });

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
                prompt_tokens: providerResponse.usage.prompt_tokens,
                total_tokens: providerResponse.usage.total_tokens
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
