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
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-download_zip
        const response = await nango.post({
            endpoint: '/2/files/download_zip',
            baseUrlOverride: 'https://content.dropboxapi.com',
            headers: {
                'Dropbox-API-Arg': JSON.stringify({ path: input.path }),
                'Content-Type': ''
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

        // Encode binary zip content as base64
        let zipContent: string;
        if (Buffer.isBuffer(response.data)) {
            zipContent = response.data.toString('base64');
        } else if (typeof response.data === 'string') {
            zipContent = Buffer.from(response.data, 'binary').toString('base64');
        } else {
            throw new nango.ActionError({
                type: 'download_failed',
                message: 'Unexpected response data format when downloading folder as zip'
            });
        }

        // Parse metadata from the Dropbox-API-Result header
        // The header contains a DownloadZipResult envelope: { "metadata": { ... folder metadata ... } }
        let metadata: z.infer<typeof ProviderFolderMetadataSchema>;
        const metadataHeader = response.headers && (response.headers['dropbox-api-result'] || response.headers['Dropbox-API-Result']);

        if (metadataHeader && typeof metadataHeader === 'string') {
            // @allowTryCatch - Parsing JSON from header may fail if format is unexpected
            try {
                const parsedHeader = JSON.parse(metadataHeader);
                const envelopeResult = z.object({ metadata: ProviderFolderMetadataSchema }).safeParse(parsedHeader);
                if (envelopeResult.success) {
                    metadata = envelopeResult.data.metadata;
                } else {
                    metadata = ProviderFolderMetadataSchema.parse(parsedHeader);
                }
            } catch {
                metadata = {
                    id: 'unknown',
                    name: input.path.split('/').pop() || 'folder'
                };
            }
        } else {
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
