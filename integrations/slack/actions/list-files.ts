import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    channel_id: z.string().optional().describe('Channel ID to filter files by channel. Example: "C1234567890"'),
    limit: z.number().optional().describe('Maximum number of files to return per page. Default: 100. Max: 200.')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string().optional(),
    url_private: z.string().optional(),
    filetype: z.string(),
    size: z.number(),
    created: z.number(),
    user: z.string(),
    channels: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    next_cursor: z.union([z.string(), z.null()]),
    total: z.number().optional()
});

const action = createAction({
    description: 'List files shared in the workspace',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-files',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['cursor'] = input.cursor;
        }
        if (input.channel_id) {
            params['channel'] = input.channel_id;
        }
        if (input.limit) {
            params['limit'] = input.limit;
        }

        // https://api.slack.dev/apis/files/list
        const response = await nango.get({
            endpoint: 'files.list',
            params,
            retries: 3
        });

        if (!response.data || !response.data.files) {
            return {
                files: [],
                next_cursor: null,
                total: 0
            };
        }

        const files = response.data.files.map(
            (file: {
                id: string;
                name: string;
                title?: string;
                url_private?: string;
                filetype: string;
                size: number;
                created: number;
                user: string;
                channels?: string[];
            }) => ({
                id: file.id,
                name: file.name,
                title: file.title,
                url_private: file.url_private,
                filetype: file.filetype,
                size: file.size,
                created: file.created,
                user: file.user,
                channels: file.channels
            })
        );

        return {
            files,
            next_cursor: response.data.paging?.cursor || null,
            total: response.data.paging?.total || files.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
