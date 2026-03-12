import { z } from 'zod';
import { createAction } from 'nango';

// API Reference: https://developers.google.com/drive/api/reference/rest/v3/files/update

const InputSchema = z.object({
    file_id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    mime_type: z.string().optional(),
    starred: z.boolean().optional(),
    trashed: z.boolean().optional(),
    parents: z.array(z.string()).optional(),
    app_properties: z.record(z.string(), z.string()).optional(),
    properties: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    mime_type: z.string(),
    description: z.union([z.string(), z.null()]),
    starred: z.boolean(),
    trashed: z.boolean(),
    parents: z.array(z.string()),
    created_time: z.string(),
    modified_time: z.string(),
    size: z.union([z.string(), z.null()]),
    web_view_link: z.union([z.string(), z.null()])
});

const action = createAction({
    description: "Update a file's metadata",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-file',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the request body with only the fields that are provided
        const requestBody: Record<string, any> = {};

        if (input.name !== undefined) requestBody['name'] = input.name;
        if (input.description !== undefined) requestBody['description'] = input.description;
        if (input.mime_type !== undefined) requestBody['mimeType'] = input.mime_type;
        if (input.starred !== undefined) requestBody['starred'] = input.starred;
        if (input.trashed !== undefined) requestBody['trashed'] = input.trashed;
        if (input.parents !== undefined) requestBody['parents'] = input.parents;
        if (input.app_properties !== undefined) requestBody['appProperties'] = input.app_properties;
        if (input.properties !== undefined) requestBody['properties'] = input.properties;

        // https://developers.google.com/drive/api/reference/rest/v3/files/update
        const response = await nango.patch({
            endpoint: `/drive/v3/files/${input.file_id}`,
            data: requestBody,
            params: {
                supportsAllDrives: 'true',
                fields: 'id,name,mimeType,description,starred,trashed,parents,createdTime,modifiedTime,size,webViewLink'
            },
            retries: 3
        });

        const file = response.data;

        return {
            id: file['id'],
            name: file['name'],
            mime_type: file['mimeType'],
            description: file['description'] || null,
            starred: file['starred'] || false,
            trashed: file['trashed'] || false,
            parents: file['parents'] || [],
            created_time: file['createdTime'],
            modified_time: file['modifiedTime'],
            size: file['size'] || null,
            web_view_link: file['webViewLink'] || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
