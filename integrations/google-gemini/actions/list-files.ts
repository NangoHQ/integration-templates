import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageSize: z.number().optional().describe('Maximum number of files to return per page. Defaults to 10, maximum is 100.'),
    pageToken: z.string().optional().describe('Pagination token from a previous list-files call. Omit for the first page.')
});

const ProviderFileSchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    expirationTime: z.string().optional(),
    sha256Hash: z.string().optional(),
    uri: z.string().optional(),
    downloadUri: z.string().optional(),
    state: z.string().optional(),
    source: z.string().optional(),
    error: z.object({}).passthrough().optional(),
    videoMetadata: z.object({}).passthrough().optional()
});

const ProviderListResponseSchema = z.object({
    files: z.array(ProviderFileSchema).optional(),
    nextPageToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderFileSchema),
    next_page_token: z.string().optional().describe('Token to retrieve the next page of results.')
});

const action = createAction({
    description: 'List files uploaded to the Gemini Files API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://ai.google.dev/api/files#v1beta.files.list
        const response = await nango.get({
            endpoint: '/v1beta/files',
            params: {
                ...(input.pageSize !== undefined && { pageSize: input.pageSize.toString() }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        const items = parsed.files ?? [];

        return {
            items,
            ...(parsed.nextPageToken !== undefined && { next_page_token: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
