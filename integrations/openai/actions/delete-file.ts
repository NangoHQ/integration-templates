import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file to delete. Example: "file-abc123"')
});

const ProviderOutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a file from OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/files/delete
        const response = await nango.delete({
            endpoint: `/v1/files/${encodeURIComponent(input.fileId)}`,
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            id: providerOutput.id,
            object: providerOutput.object,
            deleted: providerOutput.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
