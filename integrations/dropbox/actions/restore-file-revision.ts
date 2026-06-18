import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The path of the file to restore. Example: "/Documents/example.txt"'),
    rev: z.string().describe('The revision ID to restore to. Example: "015a01044acb99900000001aa8954d0"')
});

const ProviderFileMetadataSchema = z.object({
    name: z.string(),
    id: z.string(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string(),
    size: z.number(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    content_hash: z.string().optional()
});

const OutputSchema = z.object({
    name: z.string(),
    id: z.string(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string(),
    size: z.number(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    content_hash: z.string().optional()
});

const action = createAction({
    description: 'Restore a previous Dropbox file revision to the current path',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write', 'files.metadata.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-restore
        const response = await nango.post({
            endpoint: '/2/files/restore',
            data: {
                path: input.path,
                rev: input.rev
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File or revision not found',
                path: input.path,
                rev: input.rev
            });
        }

        const fileMetadata = ProviderFileMetadataSchema.parse(response.data);

        return {
            name: fileMetadata.name,
            id: fileMetadata.id,
            rev: fileMetadata.rev,
            size: fileMetadata.size,
            ...(fileMetadata.client_modified !== undefined && { client_modified: fileMetadata.client_modified }),
            ...(fileMetadata.server_modified !== undefined && { server_modified: fileMetadata.server_modified }),
            ...(fileMetadata.path_lower !== undefined && { path_lower: fileMetadata.path_lower }),
            ...(fileMetadata.path_display !== undefined && { path_display: fileMetadata.path_display }),
            ...(fileMetadata.content_hash !== undefined && { content_hash: fileMetadata.content_hash })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
