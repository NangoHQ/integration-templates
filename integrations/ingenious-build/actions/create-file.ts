import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().describe('Publicly accessible URL to download the file from. Example: "https://example.com/document.pdf"'),
    file_name: z.string().optional().describe('Optional file name for the file. Example: "document.pdf"'),
    description: z.string().max(1000).optional().describe('Optional description for the file.'),
    original_created_at: z
        .string()
        .optional()
        .describe('Optional original creation date of the file content, in UTC ISO 8601 format. Example: "2024-04-01T12:00:00Z"')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created file record.')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a file record by providing a URL for the platform to download from.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/v2-create-file.md
            endpoint: '/api/v2/pub/files',
            data: {
                url: input.url,
                ...(input.file_name !== undefined && { file_name: input.file_name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.original_created_at !== undefined && { original_created_at: input.original_created_at })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
