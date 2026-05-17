import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        itemId: z.string().optional().describe('The ID of the drive item to retrieve. Example: "123ABC"'),
        path: z.string().optional().describe('The path to the drive item from the root. Example: "/Documents/file.txt"')
    })
    .refine((data) => data.itemId || data.path, {
        message: 'Either itemId or path must be provided'
    });

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the item'),
    name: z.string().describe('The name of the item'),
    type: z.enum(['file', 'folder']).describe('The type of the item'),
    size: z.number().optional().describe('Size of the file in bytes'),
    createdDateTime: z.string().optional().describe('Date and time of item creation'),
    lastModifiedDateTime: z.string().optional().describe('Date and time the item was last modified'),
    webUrl: z.string().optional().describe('URL to view the item in OneDrive'),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
        .describe('Reference to the parent folder'),
    downloadUrl: z.string().optional().describe('URL to download the file content'),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional()
        .describe('File metadata if this is a file'),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional()
        .describe('Folder metadata if this is a folder')
});

const action = createAction({
    description: 'Retrieve a file or folder by ID or path.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;

        if (input.itemId) {
            endpoint = `/v1.0/drive/items/${encodeURIComponent(input.itemId)}`;
        } else if (input.path) {
            const cleanPath = input.path.startsWith('/') ? input.path.slice(1) : input.path;
            endpoint = `/v1.0/drive/root:/${cleanPath.split('/').map(encodeURIComponent).join('/')}`;
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either itemId or path must be provided'
            });
        }

        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_get
        const response = await nango.get({
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found'
            });
        }

        const item = response.data;

        const type = item.file !== undefined ? 'file' : 'folder';

        return {
            id: item.id,
            name: item.name,
            type,
            ...(item.size !== undefined && { size: item.size }),
            ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
            ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
            ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
            ...(item.parentReference !== undefined && {
                parentReference: {
                    ...(item.parentReference.id !== undefined && { id: item.parentReference.id }),
                    ...(item.parentReference.path !== undefined && { path: item.parentReference.path })
                }
            }),
            ...(item['@microsoft.graph.downloadUrl'] !== undefined && { downloadUrl: item['@microsoft.graph.downloadUrl'] }),
            ...(item.file !== undefined && {
                file: {
                    ...(item.file.mimeType !== undefined && { mimeType: item.file.mimeType })
                }
            }),
            ...(item.folder !== undefined && {
                folder: {
                    ...(item.folder.childCount !== undefined && { childCount: item.folder.childCount })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
