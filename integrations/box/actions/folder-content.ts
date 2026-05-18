import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().optional().describe('The ID of the folder to fetch content from. Defaults to the root folder ("0"). Example: "123456789"'),
    marker: z.string().optional().describe('A pagination cursor returned by a previous call. Use this to fetch the next page of results.')
});

const FolderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    modified_at: z.string(),
    url: z.string().nullable().optional()
});

const FileItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    modified_at: z.string(),
    download_url: z.string()
});

const OutputSchema = z.object({
    folders: z.array(FolderItemSchema),
    files: z.array(FileItemSchema),
    next_marker: z.string().optional()
});

const ItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    modified_at: z.string().optional(),
    shared_link: z
        .object({
            download_url: z.string().optional()
        })
        .optional()
        .nullable()
});

const action = createAction({
    description:
        'Fetches the top-level content (files and folders) of a folder given its ID. If no folder ID is provided, it fetches content from the root folder.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/folder-content',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const folderId = input.folder_id ?? '0';

        const response = await nango.get({
            // https://developer.box.com/reference/get-folders-id-items/
            endpoint: `/2.0/folders/${folderId}/items`,
            params: {
                fields: 'id,name,modified_at,shared_link',
                useMarker: 'true',
                limit: '100',
                ...(input.marker && { marker: input.marker })
            },
            retries: 3
        });

        const items: z.infer<typeof ItemSchema>[] = (response.data.entries ?? []).map((entry: unknown) => ItemSchema.parse(entry));

        const folders: z.infer<typeof FolderItemSchema>[] = [];
        const files: z.infer<typeof FileItemSchema>[] = [];

        for (const item of items) {
            if (item.type === 'folder') {
                folders.push({
                    id: item.id,
                    name: item.name,
                    modified_at: item.modified_at ?? '',
                    url: item.shared_link?.download_url ?? null
                });
            } else if (item.type === 'file') {
                files.push({
                    id: item.id,
                    name: item.name,
                    modified_at: item.modified_at ?? '',
                    download_url: item.shared_link?.download_url ?? ''
                });
            }
        }

        return {
            folders,
            files,
            ...(response.data.next_marker && { next_marker: response.data.next_marker })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
