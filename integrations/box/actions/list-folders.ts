import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().optional().describe('The ID of the folder to list items from. Use "0" for the root folder. Defaults to "0".'),
    limit: z.number().optional().describe('The maximum number of items to return per page. Maximum is 1000.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FolderItemSchema = z.object({
    id: z.string(),
    type: z.literal('folder'),
    name: z.string(),
    sequence_id: z.string().optional(),
    etag: z.string().optional()
});

const OutputSchema = z.object({
    folders: z.array(FolderItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List folders from Box',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-folders',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const folderId = input.folder_id ?? '0';
        const params: Record<string, string | number> = {
            usemarker: 'true',
            ...(input.limit !== undefined && { limit: String(input.limit) }),
            ...(input.cursor !== undefined && { marker: input.cursor })
        };

        // https://developer.box.com/reference/get-folders-id-items/
        const response = await nango.get({
            endpoint: `/2.0/folders/${folderId}/items`,
            params: params,
            retries: 3
        });

        const ItemsSchema = z.object({
            entries: z.array(z.unknown()),
            next_marker: z.string().optional()
        });

        const parsed = ItemsSchema.parse(response.data);
        const EntryTypeSchema = z.object({
            type: z.string()
        });

        const folders = parsed.entries.filter((entry: unknown) => {
            const result = EntryTypeSchema.safeParse(entry);
            if (!result.success) {
                return false;
            }
            return result.data.type === 'folder';
        });

        const validatedFolders: z.infer<typeof FolderItemSchema>[] = [];
        for (const folder of folders) {
            const result = FolderItemSchema.safeParse(folder);
            if (result.success) {
                validatedFolders.push(result.data);
            }
        }

        return {
            folders: validatedFolders,
            ...(parsed.next_marker !== undefined && { next_cursor: parsed.next_marker })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
