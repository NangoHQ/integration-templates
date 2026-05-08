import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parentItemId: z
        .string()
        .describe('The ID of the parent item (folder) where the new folder should be created. Example: "root" or "01A1B2C3D4E5F6G7H8I9J0K"'),
    folderName: z.string().describe('The name for the new folder. Example: "My New Folder"'),
    conflictBehavior: z
        .enum(['rename', 'fail', 'replace'])
        .optional()
        .describe('The conflict behavior if a folder with the same name exists. Default is "rename".')
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentReference: z
        .object({
            id: z.string(),
            path: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the newly created folder'),
    name: z.string().describe('The name of the created folder'),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentId: z.string().optional()
});

const action = createAction({
    description: 'Create a folder in the personal OneDrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-folder',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_post_children
        const response = await nango.post({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.parentItemId)}/children`,
            data: {
                name: input.folderName,
                folder: {},
                '@microsoft.graph.conflictBehavior': input.conflictBehavior || 'rename'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create folder: empty response from API'
            });
        }

        const providerFolder = FolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            ...(providerFolder.size !== undefined && { size: providerFolder.size }),
            ...(providerFolder.webUrl !== undefined && { webUrl: providerFolder.webUrl }),
            ...(providerFolder.createdDateTime !== undefined && { createdDateTime: providerFolder.createdDateTime }),
            ...(providerFolder.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerFolder.lastModifiedDateTime }),
            ...(providerFolder.parentReference?.id !== undefined && { parentId: providerFolder.parentReference.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
