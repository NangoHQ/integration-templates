import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vector_store_id: z.string().describe('The ID of the vector store to delete. Example: "vs_abc123"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.literal('vector_store.deleted'),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the deleted vector store'),
    object: z.literal('vector_store.deleted').describe('The object type'),
    deleted: z.boolean().describe('Whether the vector store was successfully deleted')
});

const action = createAction({
    description: 'Delete a vector store from OpenAI',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/vector-stores/delete
        const response = await nango.delete({
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete vector store',
                vector_store_id: input.vector_store_id
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            object: providerData.object,
            deleted: providerData.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
