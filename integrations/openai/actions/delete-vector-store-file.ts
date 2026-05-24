import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vector_store_id: z.string().describe('The ID of the vector store. Example: "vs_abc123"'),
    file_id: z.string().describe('The ID of the file to remove from the vector store. Example: "file-abc123"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('vector_store.file.deleted'),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Remove a file from a vector store (does not delete the underlying file object)',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-vector-store-file'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://platform.openai.com/docs/api-reference/vector-stores-files/deleteFile
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}/files/${encodeURIComponent(input.file_id)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (!providerData.deleted) {
            throw new nango.ActionError({
                type: 'deletion_failed',
                message: 'Failed to delete vector store file',
                vector_store_id: input.vector_store_id,
                file_id: input.file_id
            });
        }

        return {
            id: providerData.id,
            object: 'vector_store.file.deleted',
            deleted: providerData.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
