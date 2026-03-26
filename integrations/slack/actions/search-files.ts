import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query string. Example: "report"'),
    count: z.number().optional().describe('Number of items to return per page. Max 100. Default: 20'),
    page: z.number().optional().describe('Page number of results to return. Default: 1'),
    sort: z.enum(['score', 'timestamp']).optional().describe('Sort by score or timestamp. Default: score'),
    sort_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction: ascending or descending. Default: desc'),
    highlight: z.boolean().optional().describe('Enable query highlight markers in results. Default: false')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string().optional(),
    filetype: z.string(),
    mimetype: z.string(),
    user: z.string(),
    username: z.string(),
    created: z.number(),
    timestamp: z.number(),
    size: z.number(),
    mode: z.string(),
    is_public: z.boolean(),
    is_external: z.boolean(),
    external_type: z.string(),
    editable: z.boolean(),
    display_as_bot: z.boolean(),
    url_private: z.string().optional(),
    url_private_download: z.string().optional(),
    permalink: z.string().optional(),
    permalink_public: z.string().optional(),
    preview: z.string().optional(),
    public_url_shared: z.boolean(),
    channels: z.array(z.string()),
    groups: z.array(z.string()),
    ims: z.array(z.string()),
    comments_count: z.number(),
    pretty_type: z.string(),
    score: z.string().optional()
});

const PagingSchema = z.object({
    count: z.number(),
    page: z.number(),
    pages: z.number(),
    total: z.number()
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    paging: PagingSchema,
    total: z.number()
});

const action = createAction({
    description: 'Search workspace files with pagination',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-files',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['search:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/search.files
        const response = await nango.get({
            endpoint: 'search.files',
            params: {
                query: input.query,
                ...(input.count && { count: input.count.toString() }),
                ...(input.page && { page: input.page.toString() }),
                ...(input.sort && { sort: input.sort }),
                ...(input.sort_dir && { sort_dir: input.sort_dir }),
                ...(input.highlight && { highlight: input.highlight.toString() })
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to search files',
                query: input.query
            });
        }

        const filesData = response.data.files || {};
        const matches = filesData.matches || [];
        const paging = filesData.paging || { count: 0, page: 1, pages: 0, total: 0 };

        const files = matches.map((file: any) => ({
            id: file.id,
            name: file.name || '',
            title: file.title,
            filetype: file.filetype || '',
            mimetype: file.mimetype || '',
            user: file.user || '',
            username: file.username || '',
            created: file.created || 0,
            timestamp: file.timestamp || 0,
            size: file.size || 0,
            mode: file.mode || '',
            is_public: file.is_public || false,
            is_external: file.is_external || false,
            external_type: file.external_type || '',
            editable: file.editable || false,
            display_as_bot: file.display_as_bot || false,
            url_private: file.url_private,
            url_private_download: file.url_private_download,
            permalink: file.permalink,
            permalink_public: file.permalink_public,
            preview: file.preview ?? undefined,
            public_url_shared: file.public_url_shared || false,
            channels: file.channels || [],
            groups: file.groups || [],
            ims: file.ims || [],
            comments_count: file.comments_count || 0,
            pretty_type: file.pretty_type || '',
            score: file.score
        }));

        return {
            files,
            paging: {
                count: paging.count || 0,
                page: paging.page || 1,
                pages: paging.pages || 0,
                total: paging.total || 0
            },
            total: filesData.total || 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
