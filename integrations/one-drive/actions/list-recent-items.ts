import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z.object({}).passthrough().optional(),
    file: z.object({}).passthrough().optional(),
    remoteItem: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            webUrl: z.string().optional(),
            size: z.number().optional(),
            createdDateTime: z.string().optional(),
            lastModifiedDateTime: z.string().optional(),
            isFolder: z.boolean().optional(),
            isFile: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'List recently used items from the user drive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/drive-recent
            endpoint: '/v1.0/me/drive/recent',
            retries: 3
        });

        if (!response.data || !response.data.value) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No recent items found'
            });
        }

        const recentItems = z.array(DriveItemSchema).parse(response.data.value);

        const items = recentItems.map((item) => ({
            id: item.id,
            ...(item.name !== undefined && { name: item.name }),
            ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
            ...(item.size !== undefined && { size: item.size }),
            ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
            ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
            ...(item.folder !== undefined && { isFolder: true }),
            ...(item.file !== undefined && { isFile: true })
        }));

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
