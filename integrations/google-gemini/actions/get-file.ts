import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the file to retrieve. Example: "files/abc123"')
});

const ProviderFileSchema = z.object({
    name: z.string(),
    displayName: z.string().optional().nullable(),
    mimeType: z.string().optional().nullable(),
    sizeBytes: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    uri: z.string().optional().nullable(),
    expirationTime: z.string().optional().nullable()
});

const OutputSchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.string().optional(),
    state: z.string().optional(),
    uri: z.string().optional(),
    expirationTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve metadata for a specific uploaded file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fileId = input.name.startsWith('files/') ? input.name.slice('files/'.length) : input.name;
        const response = await nango.get({
            // https://ai.google.dev/api/files#method:-files.get
            endpoint: `/v1beta/files/${encodeURIComponent(fileId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found or invalid response from provider'
            });
        }

        const parseResult = ProviderFileSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from provider'
            });
        }

        const file = parseResult.data;

        return {
            name: file.name,
            ...(file.displayName != null && { displayName: file.displayName }),
            ...(file.mimeType != null && { mimeType: file.mimeType }),
            ...(file.sizeBytes != null && { sizeBytes: file.sizeBytes }),
            ...(file.state != null && { state: file.state }),
            ...(file.uri != null && { uri: file.uri }),
            ...(file.expirationTime != null && { expirationTime: file.expirationTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
