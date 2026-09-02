import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        page_size: z.number().int().min(1).max(30).optional().describe('Number of folders per page, between 1 and 30. Defaults to 10.')
    })
    .describe('Input for listing folders.');

const ProviderFolderSchema = z.object({
    id: z.string().describe('Unique identifier for the folder.'),
    object: z.string().describe('The object type, typically "folder".'),
    name: z.string().describe('Name of the folder.'),
    parent_folder_id: z.string().nullable().describe('ID of the parent folder, or null for top-level folders.'),
    space_id: z.string().optional().describe('ID of the space this folder belongs to.')
});

const OutputSchema = z
    .object({
        folders: z.array(ProviderFolderSchema).describe('Array of folders.'),
        hasMore: z.boolean().describe('Whether there are more pages of results.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of results.')
    })
    .describe('Output for listing folders.');

/**
 * @tags: [read]
 * @tagReason: This action only reads folder data from the Granola API.
 */
const action = createAction({
    description: 'List folders, including their parent/child hierarchy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }

        const response = await nango.get({
            // https://docs.granola.ai/api-reference/list-folders.md
            endpoint: '/v1/folders',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                folders: z.array(
                    z.object({
                        id: z.string(),
                        object: z.string(),
                        name: z.string(),
                        parent_folder_id: z.string().nullable(),
                        space_id: z.string().optional()
                    })
                ),
                hasMore: z.boolean(),
                cursor: z.string().nullable()
            })
            .parse(response.data);

        return {
            folders: providerResponse.folders.map((folder) => ({
                id: folder.id,
                object: folder.object,
                name: folder.name,
                parent_folder_id: folder.parent_folder_id,
                ...(folder.space_id != null && { space_id: folder.space_id })
            })),
            hasMore: providerResponse.hasMore,
            ...(providerResponse.cursor != null && { next_cursor: providerResponse.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
