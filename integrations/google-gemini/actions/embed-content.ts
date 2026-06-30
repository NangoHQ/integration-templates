import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    content: z.string().min(1).describe('The text content to embed.'),
    model: z.string().optional().describe('The embedding model name. Defaults to gemini-embedding-001.'),
    taskType: z
        .enum(['RETRIEVAL_DOCUMENT', 'RETRIEVAL_QUERY', 'SEMANTIC_SIMILARITY', 'CLASSIFICATION', 'CLUSTERING'])
        .optional()
        .describe('The task type for which the embeddings will be used.'),
    title: z.string().optional().describe('An optional title for the text. Only applicable when taskType is RETRIEVAL_DOCUMENT.'),
    outputDimensionality: z
        .number()
        .int()
        .min(1)
        .max(3072)
        .optional()
        .describe('Reduced dimension for the output embedding. If set, excessive values are truncated from the end.')
});

const ProviderResponseSchema = z.object({
    embedding: z.object({
        values: z.array(z.number())
    }),
    truncated: z.boolean().optional(),
    usageMetadata: z
        .object({
            promptTokenCount: z.number().int().optional(),
            candidatesTokenCount: z.number().int().optional(),
            totalTokenCount: z.number().int().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    values: z.array(z.number()).describe('The embedding vector values.'),
    truncated: z.boolean().optional(),
    promptTokenCount: z.number().int().optional(),
    totalTokenCount: z.number().int().optional()
});

interface EmbedContentConfig {
    taskType?: string;
    title?: string;
    outputDimensionality?: number;
}

interface RequestBody {
    content: {
        parts: Array<{ text: string }>;
    };
    embedContentConfig?: EmbedContentConfig;
}

const action = createAction({
    description: 'Generate a single embedding vector for text content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const model = input.model ?? 'gemini-embedding-001';
        const requestBody: RequestBody = {
            content: {
                parts: [{ text: input.content }]
            }
        };

        const embedContentConfig: EmbedContentConfig = {};
        if (input.taskType !== undefined) {
            embedContentConfig.taskType = input.taskType;
        }
        if (input.title !== undefined) {
            embedContentConfig.title = input.title;
        }
        if (input.outputDimensionality !== undefined) {
            embedContentConfig.outputDimensionality = input.outputDimensionality;
        }
        if (Object.keys(embedContentConfig).length > 0) {
            requestBody.embedContentConfig = embedContentConfig;
        }

        const modelId = model.startsWith('models/') ? model.slice('models/'.length) : model;
        const response = await nango.post({
            // https://ai.google.dev/api/embeddings#method:-models.embedcontent
            endpoint: `/v1beta/models/${encodeURIComponent(modelId)}:embedContent`,
            data: requestBody,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            values: providerData.embedding.values,
            ...(providerData.truncated !== undefined && { truncated: providerData.truncated }),
            ...(providerData.usageMetadata?.promptTokenCount !== undefined && { promptTokenCount: providerData.usageMetadata.promptTokenCount }),
            ...(providerData.usageMetadata?.totalTokenCount !== undefined && { totalTokenCount: providerData.usageMetadata.totalTokenCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
