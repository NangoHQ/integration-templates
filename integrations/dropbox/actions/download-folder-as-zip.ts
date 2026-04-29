import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The path of the folder to download. Example: "/my-folder". Note: The root folder "/" is not supported.')
});

const ProviderFolderMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional()
});

const OutputSchema = z.object({
    metadata: z.object({
        id: z.string(),
        name: z.string(),
        path_lower: z.string().optional(),
        path_display: z.string().optional()
    }),
    zip_content: z.string().describe('Base64-encoded zip file content')
});

const action = createAction({
    description: 'Download a Dropbox folder as a zip archive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/download-folder-as-zip',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-download_zip
        const response = await nango.get({
            endpoint: '/2/files/download_zip',
            baseUrlOverride: 'https://content.dropboxapi.com',
            params: {
                arg: JSON.stringify({ path: input.path })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Folder not found or could not be downloaded as zip',
                path: input.path
            });
        }

        // The zip content is returned as binary in the response body
        // The metadata is returned in the Dropbox-API-Result header
        const zipContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        // Parse metadata from the Dropbox-API-Result header if available
        let metadata: z.infer<typeof ProviderFolderMetadataSchema>;
        const metadataHeader = response.headers && (response.headers['dropbox-api-result'] || response.headers['Dropbox-API-Result']);

        if (metadataHeader && typeof metadataHeader === 'string') {
            // @allowTryCatch - Parsing JSON from header may fail if format is unexpected
            try {
                const parsedMetadata = JSON.parse(metadataHeader);
                metadata = ProviderFolderMetadataSchema.parse(parsedMetadata);
            } catch {
                // If parsing fails, create minimal metadata
                metadata = {
                    id: 'unknown',
                    name: input.path.split('/').pop() || 'folder'
                };
            }
        } else {
            // No metadata header available, create minimal metadata
            metadata = {
                id: 'unknown',
                name: input.path.split('/').pop() || 'folder'
            };
        }

        return {
            metadata: {
                id: metadata.id,
                name: metadata.name,
                ...(metadata.path_lower !== undefined && { path_lower: metadata.path_lower }),
                ...(metadata.path_display !== undefined && { path_display: metadata.path_display })
            },
            zip_content: zipContent
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
