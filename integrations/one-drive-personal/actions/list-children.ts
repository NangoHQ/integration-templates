import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().optional().describe('The ID of the folder to list children for. Omit to list children of the root folder. Example: "01ABC123DEF456"'),
    cursor: z.string().optional().describe('Pagination cursor (@odata.nextLink) from the previous response. Omit for the first page.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            driveId: z.string().optional()
        })
        .optional(),
    deleted: z
        .object({
            state: z.string().optional()
        })
        .optional()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderDriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    isFolder: z.boolean().optional(),
    childCount: z.number().optional(),
    mimeType: z.string().optional(),
    parentId: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(OutputDriveItemSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List items under a folder in OneDrive Personal.',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        let endpoint: string;

        if (input.cursor) {
            endpoint = input.cursor;
        } else if (input.itemId) {
            endpoint = `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/children`;
        } else {
            endpoint = '/v1.0/drive/root/children';
        }

        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_children
        const response = await nango.get({
            endpoint: endpoint,
            retries: 3
        });

        const providerData = ProviderListResponseSchema.parse(response.data);

        const items = providerData.value.map((item) => {
            const isFolder = item.folder !== undefined;

            return {
                id: item.id,
                name: item.name,
                ...(item.size !== undefined && { size: item.size }),
                ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                ...(isFolder && { isFolder: true }),
                ...(isFolder && item.folder?.childCount !== undefined && { childCount: item.folder.childCount }),
                ...(!isFolder && item.file?.mimeType !== undefined && { mimeType: item.file.mimeType }),
                ...(item.parentReference?.id !== undefined && { parentId: item.parentReference.id })
            };
        });

        return {
            items: items,
            ...(providerData['@odata.nextLink'] !== undefined && { nextLink: providerData['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
