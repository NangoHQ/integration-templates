import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().optional().describe('Item ID of the folder. Use "root" or omit to list root children. Example: "0123456789ABCDEF!123"')
});

const FileSystemInfoSchema = z.object({
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const FolderSchema = z.object({
    childCount: z.number().optional()
});

const DeletedSchema = z.object({
    state: z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    fileSystemInfo: FileSystemInfoSchema.optional(),
    folder: FolderSchema.optional(),
    deleted: DeletedSchema.optional()
});

const ListOutputSchema = z.object({
    items: z.array(DriveItemSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List items under a folder',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-children',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const itemId = input.itemId || 'root';
        const encodedItemId = encodeURIComponent(itemId);

        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-list-children
            endpoint: `/v1.0/me/drive/items/${encodedItemId}/children`,
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data.value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API'
            });
        }

        const items = response.data.value.map((item: unknown) => {
            const parsed = DriveItemSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse drive item',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        return {
            items,
            ...(response.data['@odata.nextLink'] !== undefined && {
                nextLink: response.data['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
