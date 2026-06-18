import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to retrieve. Example: "file_01HqW8Kq0Z2Q2W8Kq0Z2Q2W8"')
});

const ScopeSchema = z.object({
    id: z.string(),
    type: z.literal('session')
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.literal('file'),
    downloadable: z.boolean().optional(),
    scope: ScopeSchema.nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single file from Anthropic.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://docs.anthropic.com/en/api/files
            endpoint: `/v1/files/${encodeURIComponent(input.file_id)}`,
            headers: {
                'anthropic-beta': 'files-api-2025-04-14'
            },
            retries: 3
        });

        const file = OutputSchema.parse(response.data);

        return file;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
