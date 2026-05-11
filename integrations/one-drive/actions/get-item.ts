import { z } from 'zod';
import { createAction } from 'nango';

// Microsoft Graph API DriveItem schema (passthrough for raw response)
// https://learn.microsoft.com/graph/api/resources/driveitem
const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    '@microsoft.graph.downloadUrl': z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    description: z.string().optional().nullable(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    file: z
        .object({
            mimeType: z.string().optional(),
            hashes: z
                .object({
                    sha1Hash: z.string().optional(),
                    quickXorHash: z.string().optional()
                })
                .optional()
        })
        .optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            driveId: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    deleted: z
        .object({
            state: z.string().optional()
        })
        .optional()
});

const InputSchema = z.object({
    itemId: z.string().optional().describe('The unique ID of the item to retrieve. Example: "01X3XYZABC123"'),
    path: z.string().optional().describe('The path to the item relative to the root. Example: "/Documents/file.txt" or "Documents/folder"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    description: z.string().optional(),
    isFolder: z.boolean().optional(),
    folderChildCount: z.number().optional(),
    fileMimeType: z.string().optional(),
    parentId: z.string().optional(),
    parentDriveId: z.string().optional(),
    parentPath: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a file or folder by ID or path',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'Files.Read.All', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Validate that either itemId or path is provided, but not both
        if (!input.itemId && !input.path) {
            throw new nango.ActionError({
                type: 'missing_identifier',
                message: 'Either itemId or path must be provided'
            });
        }

        if (input.itemId && input.path) {
            throw new nango.ActionError({
                type: 'ambiguous_identifier',
                message: 'Provide either itemId or path, not both'
            });
        }

        let endpoint: string;
        if (input.itemId) {
            // https://learn.microsoft.com/graph/api/driveitem-get
            endpoint = `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}`;
        } else {
            // Path-based addressing using root: path syntax
            // https://learn.microsoft.com/graph/api/driveitem-get
            const path = input.path!.startsWith('/') ? input.path! : `/${input.path!}`;
            // For root itself (/), use /me/drive/root. For other paths, use root: syntax.
            if (path === '/') {
                endpoint = '/v1.0/me/drive/root';
            } else {
                // Encode each segment individually to handle special characters while
                // preserving the / separators required by Graph root: path addressing.
                const encodedPath = path
                    .split('/')
                    .map((s) => encodeURIComponent(s))
                    .join('/');
                endpoint = `/v1.0/me/drive/root:${encodedPath}`;
            }
        }

        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-get
            endpoint: endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found',
                ...(input.itemId && { itemId: input.itemId }),
                ...(input.path && { path: input.path })
            });
        }

        const item = ProviderDriveItemSchema.parse(response.data);

        return {
            id: item.id,
            ...(item.name !== undefined && { name: item.name }),
            ...(item.size !== undefined && { size: item.size }),
            ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
            ...(item['@microsoft.graph.downloadUrl'] !== undefined && { downloadUrl: item['@microsoft.graph.downloadUrl'] }),
            ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
            ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
            ...(item.description !== undefined && item.description !== null && { description: item.description }),
            ...(item.folder !== undefined && { isFolder: true }),
            ...(item.folder?.childCount !== undefined && { folderChildCount: item.folder.childCount }),
            ...(item.file?.mimeType !== undefined && { fileMimeType: item.file.mimeType }),
            ...(item.parentReference?.id !== undefined && { parentId: item.parentReference.id }),
            ...(item.parentReference?.driveId !== undefined && {
                parentDriveId: item.parentReference.driveId
            }),
            ...(item.parentReference?.path !== undefined && { parentPath: item.parentReference.path })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
