import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('Path in the user\'s Dropbox to save the file. Example: "/folder/document.txt"'),
    content: z.string().describe('The file content as a base64-encoded string or raw string for text files.'),
    encoding: z.enum(['base64', 'utf8']).optional().describe('The encoding of the content. Defaults to "utf8".'),
    mode: z
        .enum(['add', 'overwrite', 'update'])
        .optional()
        .describe(
            'Selects what to do if the file already exists. "add" will add a new file, "overwrite" will overwrite, "update" will update only if the revision matches (requires rev). Defaults to "add".'
        ),
    rev: z.string().optional().describe('The revision of the file to update. Required when mode is "update".'),
    autorename: z
        .boolean()
        .optional()
        .describe("If true and there's a conflict, Dropbox will try to autorename the file to avoid the conflict. Defaults to false."),
    mute: z.boolean().optional().describe('If true, suppresses user notifications for this modification. Defaults to false.'),
    client_modified: z
        .string()
        .optional()
        .describe('The value to store as the client_modified timestamp in ISO 8601 format. If not set, Dropbox uses the current time.')
});

const ProviderFileMetadataSchema = z.object({
    name: z.string(),
    path_lower: z.string(),
    id: z.string(),
    client_modified: z.string(),
    server_modified: z.string(),
    rev: z.string(),
    size: z.number()
});

const OutputSchema = z.object({
    name: z.string().describe('The name of the file.'),
    path_lower: z.string().describe('The lowercase full path of the file.'),
    id: z.string().describe('The unique identifier of the file.'),
    client_modified: z.string().describe('The timestamp when the file was last modified by the client.'),
    server_modified: z.string().describe('The timestamp when the file was last modified on the server.'),
    rev: z.string().describe('The revision of the file.'),
    size: z.number().describe('The file size in bytes.')
});

const action = createAction({
    description: 'Upload a small file directly to Dropbox.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write', 'files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encoding = input.encoding || 'utf8';

        let fileContent: Buffer;
        if (encoding === 'base64') {
            fileContent = Buffer.from(input.content, 'base64');
        } else {
            fileContent = Buffer.from(input.content, 'utf8');
        }

        if (input.mode === 'update' && !input.rev) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'rev is required when mode is "update"'
            });
        }

        const dropboxApiArg: Record<string, unknown> = {
            path: input.path,
            mode: input.mode === 'update' ? { '.tag': 'update', update: { rev: input.rev } } : input.mode || 'add',
            autorename: input.autorename || false,
            mute: input.mute || false
        };

        if (input.client_modified) {
            dropboxApiArg['client_modified'] = input.client_modified;
        }

        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://content.dropboxapi.com',
            // https://www.dropbox.com/developers/documentation/http/documentation#files-upload
            endpoint: '/2/files/upload',
            headers: {
                'Dropbox-API-Arg': JSON.stringify(dropboxApiArg),
                'Content-Type': 'application/octet-stream'
            },
            data: fileContent,
            retries: 3
        };

        // https://www.dropbox.com/developers/documentation/http/documentation#files-upload
        const response = await nango.post(config);

        const fileMetadata = ProviderFileMetadataSchema.parse(response.data);

        return {
            name: fileMetadata.name,
            path_lower: fileMetadata.path_lower,
            id: fileMetadata.id,
            client_modified: fileMetadata.client_modified,
            server_modified: fileMetadata.server_modified,
            rev: fileMetadata.rev,
            size: fileMetadata.size
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
