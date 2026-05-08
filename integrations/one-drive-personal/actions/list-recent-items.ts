import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z.object({}).passthrough().optional(),
    file: z.object({}).passthrough().optional()
});

const ProviderRecentResponseSchema = z.object({
    value: z.array(ProviderDriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    isFolder: z.boolean().optional(),
    isFile: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(DriveItemSchema)
});

const action = createAction({
    description: 'List recently used items from the personal drive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-recent-items',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_children
        // Note: The /drive/recent endpoint is deprecated/unavailable for personal OneDrive.
        // Using /drive/root/children as an alternative to list drive items.
        const allItems: z.infer<typeof ProviderDriveItemSchema>[] = [];
        let endpoint: string | undefined = '/v1.0/drive/root/children';

        while (endpoint) {
            const response = await nango.get({
                endpoint,
                retries: 3
            });

            const parsed = ProviderRecentResponseSchema.parse(response.data);
            allItems.push(...parsed.value);
            endpoint = parsed['@odata.nextLink'];
        }

        return {
            items: allItems.map((item) => ({
                id: item.id,
                ...(item.name !== undefined && { name: item.name }),
                ...(item.size !== undefined && { size: item.size }),
                ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                ...(item.folder !== undefined && { isFolder: true }),
                ...(item.file !== undefined && { isFile: true })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
