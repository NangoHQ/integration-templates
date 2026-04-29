import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The path of the file to download. Example: "/Homework/math/Prime_Numbers.txt" or "id:a4ayc_80_OEAAAAAAAAAYa"')
});

const ProviderFileMetadataSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string().optional(),
    size: z.number().optional(),
    content_hash: z.string().optional(),
    is_downloadable: z.boolean().optional()
});

const OutputSchema = z.object({
    metadata: z.object({
        name: z.string(),
        path_lower: z.string().optional(),
        path_display: z.string().optional(),
        id: z.string(),
        client_modified: z.string().optional(),
        server_modified: z.string().optional(),
        rev: z.string().optional(),
        size: z.number().optional(),
        content_hash: z.string().optional(),
        is_downloadable: z.boolean().optional()
    }),
    bytes: z.string().describe('Base64-encoded file content')
});

const action = createAction({
    description: 'Download file contents from Dropbox.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/download-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // First, get the file metadata
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_metadata
        const metadataResponse = await nango.post({
            endpoint: '/2/files/get_metadata',
            data: {
                path: input.path,
                include_media_info: false,
                include_deleted: false,
                include_has_explicit_shared_members: false
            },
            retries: 3
        });

        if (!metadataResponse.data) {
            throw new nango.ActionError({
                message: 'File not found'
            });
        }

        const providerMetadata = ProviderFileMetadataSchema.parse(metadataResponse.data);

        // Then, download the file content
        // https://www.dropbox.com/developers/documentation/http/documentation#files-download
        // The files/download endpoint uses the content.dropboxapi.com host
        const response = await nango.post({
            endpoint: '/2/files/download',
            baseUrlOverride: 'https://content.dropboxapi.com',
            headers: {
                'Dropbox-API-Arg': JSON.stringify({ path: input.path }),
                'Content-Type': 'application/octet-stream'
            },
            retries: 3
        });

        // The file content is in the response body as binary data
        // Convert to base64 for the output
        let bytes: string;
        if (response.data && typeof response.data === 'string') {
            bytes = Buffer.from(response.data, 'binary').toString('base64');
        } else if (response.data && typeof response.data === 'object' && Buffer.isBuffer(response.data)) {
            bytes = response.data.toString('base64');
        } else {
            bytes = '';
        }

        return {
            metadata: {
                name: providerMetadata.name,
                ...(providerMetadata.path_lower !== undefined && {
                    path_lower: providerMetadata.path_lower
                }),
                ...(providerMetadata.path_display !== undefined && {
                    path_display: providerMetadata.path_display
                }),
                id: providerMetadata.id,
                ...(providerMetadata.client_modified !== undefined && {
                    client_modified: providerMetadata.client_modified
                }),
                ...(providerMetadata.server_modified !== undefined && {
                    server_modified: providerMetadata.server_modified
                }),
                ...(providerMetadata.rev !== undefined && {
                    rev: providerMetadata.rev
                }),
                ...(providerMetadata.size !== undefined && {
                    size: providerMetadata.size
                }),
                ...(providerMetadata.content_hash !== undefined && {
                    content_hash: providerMetadata.content_hash
                }),
                ...(providerMetadata.is_downloadable !== undefined && {
                    is_downloadable: providerMetadata.is_downloadable
                })
            },
            bytes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
