import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vector_store_id: z.string().describe('The ID of the vector store. Example: "vs_abc123"'),
    file_id: z.string().describe('The ID of the file. Example: "file-abc123"')
});

const LastErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const ChunkingStrategySchema = z
    .object({
        type: z.string(),
        static: z
            .object({
                max_chunk_size_tokens: z.number(),
                chunk_overlap_tokens: z.number()
            })
            .optional()
    })
    .optional();

const ProviderVectorStoreFileSchema = z.object({
    id: z.string(),
    object: z.string(),
    vector_store_id: z.string(),
    status: z.string(),
    created_at: z.number(),
    usage_bytes: z.number(),
    chunking_strategy: ChunkingStrategySchema,
    last_error: LastErrorSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    vector_store_id: z.string(),
    status: z.string(),
    created_at: z.number(),
    usage_bytes: z.number(),
    chunking_strategy: ChunkingStrategySchema,
    last_error: LastErrorSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single file attached to a vector store',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-vector-store-file',
        group: 'Vector Stores'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/vector-stores-files/getVectorStoreFile
        const response = await nango.get({
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}/files/${encodeURIComponent(input.file_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vector store file not found',
                vector_store_id: input.vector_store_id,
                file_id: input.file_id
            });
        }

        const providerFile = ProviderVectorStoreFileSchema.parse(response.data);

        return {
            id: providerFile.id,
            object: providerFile.object,
            vector_store_id: providerFile.vector_store_id,
            status: providerFile.status,
            created_at: providerFile.created_at,
            usage_bytes: providerFile.usage_bytes,
            ...(providerFile.chunking_strategy !== undefined && {
                chunking_strategy: providerFile.chunking_strategy
            }),
            ...(providerFile.last_error != null && { last_error: providerFile.last_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
