import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query string. Example: "budget"').optional(),
    cursor: z.string().optional().describe('Pagination link from the previous response. Omit for the first page.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string().describe('The unique identifier of the item.'),
    name: z.string().describe('The name of the item.'),
    size: z.number().optional().describe('The size of the item in bytes.'),
    createdDateTime: z.string().optional().describe('The date and time the item was created.'),
    lastModifiedDateTime: z.string().optional().describe('The date and time the item was last modified.'),
    webUrl: z.string().optional().describe('The URL to view the item in OneDrive.'),
    folder: z.object({}).optional().describe('Indicates the item is a folder.'),
    file: z.object({}).optional().describe('Indicates the item is a file.'),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
        .describe('Reference to the parent folder.'),
    deleted: z.object({}).optional().describe('Indicates the item has been deleted.')
});

const ProviderSearchResponseSchema = z.object({
    value: z.array(ProviderDriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string().describe('The unique identifier of the item.'),
    name: z.string().describe('The name of the item.'),
    size: z.number().optional().describe('The size of the item in bytes.'),
    created_at: z.string().optional().describe('The date and time the item was created.'),
    modified_at: z.string().optional().describe('The date and time the item was last modified.'),
    web_url: z.string().optional().describe('The URL to view the item in OneDrive.'),
    is_folder: z.boolean().optional().describe('Whether the item is a folder.'),
    is_file: z.boolean().optional().describe('Whether the item is a file.'),
    parent_id: z.string().optional().describe('The ID of the parent folder.'),
    is_deleted: z.boolean().optional().describe('Whether the item has been deleted.')
});

const OutputSchema = z.object({
    items: z.array(DriveItemSchema).describe('Array of drive items matching the search query.'),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page of results.')
});

const action = createAction({
    description: 'Search drive items by keyword.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-items',
        group: 'Drive'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_search
        let endpoint: string;

        if (input.cursor) {
            endpoint = input.cursor;
        } else {
            const searchQuery = input.query || '';
            // Try using $search query parameter which is standard OData
            endpoint = `/v1.0/drive/root/children?$search=${encodeURIComponent(searchQuery)}`;
        }

        const response = await nango.get({
            endpoint,
            retries: 3
        });

        const searchResult = ProviderSearchResponseSchema.parse(response.data);

        const items = searchResult.value.map((item) => ({
            id: item.id,
            name: item.name,
            ...(item.size !== undefined && { size: item.size }),
            ...(item.createdDateTime !== undefined && { created_at: item.createdDateTime }),
            ...(item.lastModifiedDateTime !== undefined && { modified_at: item.lastModifiedDateTime }),
            ...(item.webUrl !== undefined && { web_url: item.webUrl }),
            ...(item.folder !== undefined && { is_folder: true }),
            ...(item.file !== undefined && { is_file: true }),
            ...(item.parentReference?.id !== undefined && { parent_id: item.parentReference.id }),
            ...(item.deleted !== undefined && { is_deleted: true })
        }));

        return {
            items,
            ...(searchResult['@odata.nextLink'] !== undefined && {
                next_cursor: searchResult['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
