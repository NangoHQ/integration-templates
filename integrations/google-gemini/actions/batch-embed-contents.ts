import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const BatchRequestSchema = z.object({
    model: z.string().optional().describe('Model name. Must match the outer model. Defaults to the outer model.'),
    content: z.string().describe('Text content to embed.'),
    taskType: z
        .enum(['RETRIEVAL_DOCUMENT', 'RETRIEVAL_QUERY', 'SEMANTIC_SIMILARITY', 'CLASSIFICATION', 'CLUSTERING', 'CODE_RETRIEVAL_QUERY'])
        .optional()
        .describe('Optional task type for the embedding.')
});

const InputSchema = z.object({
    model: z.string().optional().describe('The embedding model to use. Defaults to "gemini-embedding-001".'),
    requests: z.array(BatchRequestSchema).describe('Array of embed requests.')
});

const ContentEmbeddingSchema = z.object({
    values: z.array(z.number()).optional()
});

const OutputSchema = z.object({
    embeddings: z.array(ContentEmbeddingSchema).describe('The embeddings for each request, in the same order as provided in the batch request.')
});

const action = createAction({
    description: 'Generate embeddings for multiple text contents in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const model = input.model ?? 'gemini-embedding-001';
        const modelResourceName = model.startsWith('models/') ? model : `models/${model}`;

        const providerRequests = input.requests.map((req) => {
            const reqModel = req.model ?? model;
            const reqModelResourceName = reqModel.startsWith('models/') ? reqModel : `models/${reqModel}`;

            if (reqModelResourceName !== modelResourceName) {
                throw new nango.ActionError({
                    type: 'model_mismatch',
                    message: `Request model ${reqModelResourceName} does not match outer model ${modelResourceName}.`
                });
            }

            const request: {
                model: string;
                content: { parts: { text: string }[] };
                taskType?: string;
            } = {
                model: reqModelResourceName,
                content: {
                    parts: [{ text: req.content }]
                }
            };

            if (req.taskType !== undefined) {
                request.taskType = req.taskType;
            }

            return request;
        });

        const modelId = model.startsWith('models/') ? model.slice('models/'.length) : model;
        const encodedModelPath = modelId
            .split('/')
            .map((seg) => encodeURIComponent(seg))
            .join('/');
        const config: ProxyConfiguration = {
            // https://ai.google.dev/api/embeddings#method:-models.batchembedcontents
            endpoint: `/v1beta/models/${encodedModelPath}:batchEmbedContents`,
            data: {
                requests: providerRequests
            },
            retries: 3
        };

        const response = await nango.post(config);

        const ProviderResponseSchema = z.object({
            embeddings: z
                .array(
                    z.object({
                        values: z.array(z.number()).optional()
                    })
                )
                .optional(),
            usageMetadata: z.unknown().optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            embeddings: (parsed.embeddings ?? []).map((embedding) => ({
                ...(embedding.values !== undefined && { values: embedding.values })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
