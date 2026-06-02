import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('ID of the File to delete. Example: "file_011CNha8iCJcU1wXNR6q4V8w"')
});

const ProviderDeletedFileSchema = z.object({
    id: z.string(),
    type: z.literal('file_deleted').optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('file_deleted').optional()
});

const action = createAction({
    description: 'Delete or archive a file in Anthropic.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.anthropic.com/en/api/files-delete
            endpoint: `/v1/files/${encodeURIComponent(input.file_id)}`,
            headers: {
                'anthropic-beta': 'files-api-2025-04-14'
            },
            retries: 3
        });

        const deletedFile = ProviderDeletedFileSchema.parse(response.data);

        return {
            id: deletedFile.id,
            ...(deletedFile.type !== undefined && { type: deletedFile.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
