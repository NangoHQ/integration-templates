import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Folder name or search query to find folders by name. Example: "Test Folder Alpha"')
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdTime: z.string().optional()
});

const OutputSchema = z.object({
    folders: z.array(FolderSchema),
    totalCount: z.number()
});

const action = createAction({
    description: 'Search for a folder by name or query',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/find-folder',
        group: 'Folders'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/drive/api/reference/rest/v3/files/list
        const response = await nango.get({
            endpoint: '/drive/v3/files',
            params: {
                q: `mimeType='application/vnd.google-apps.folder' and name contains '${input.name}' and trashed=false`,
                fields: 'files(id,name,createdTime)',
                spaces: 'drive',
                pageSize: 100
            },
            retries: 3
        });

        const files = response.data?.files || [];

        const folders = files.map((file: { id: string; name: string; createdTime?: string }) => ({
            id: file.id,
            name: file.name,
            createdTime: file.createdTime ?? undefined
        }));

        return {
            folders,
            totalCount: folders.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
