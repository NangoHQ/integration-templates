import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('The string to search for. May match across multiple fields based on the request arguments.'),
    path: z.string().optional().describe('A specific folder path to search in. If not specified, searches the entire Dropbox. Example: "/home/Documents"'),
    max_results: z.number().int().min(1).max(1000).optional().describe('Maximum number of results to return. Default: 100. Range: 1-1000.'),
    order_by: z.enum(['relevance', 'last_modified_time']).optional().describe('Order of results. Default: relevance.'),
    file_status: z.enum(['active', 'deleted']).optional().describe('Filter by file status. Default: active.'),
    filename_only: z.boolean().optional().describe('If true, restricts search to file names only. Default: false.'),
    file_extensions: z
        .array(z.string())
        .optional()
        .describe('Restrict search to specific file extensions. Only works for active files. Example: ["pdf", "txt"]'),
    file_categories: z
        .array(z.enum(['image', 'document', 'pdf', 'spreadsheet', 'presentation', 'audio', 'video', 'folder', 'paper', 'other']))
        .optional()
        .describe('Restrict search to specific file categories. Only works for active files.'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Omit for the first page.')
});

const MatchTypeSchema = z.object({
    '.tag': z.string()
});

// The metadata wrapper returned by search_v2
// The outer metadata has .tag = "metadata", then contains nested metadata object
const MetadataWrapperSchema = z.object({
    '.tag': z.enum(['metadata', 'unmounted', 'not_found']),
    metadata: z.unknown().optional()
});

const SearchMatchV2Schema = z.object({
    match_type: MatchTypeSchema.optional(),
    metadata: MetadataWrapperSchema.optional()
});

const OutputSchema = z.object({
    matches: z.array(SearchMatchV2Schema).describe('List of search result matches'),
    has_more: z.boolean().describe('If true, more results are available'),
    cursor: z.string().optional().describe('Cursor for fetching the next page of results')
});

const action = createAction({
    description: 'Search Dropbox files and folders by query text and path scope.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-files-and-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.metadata.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { query: string; options?: Record<string, unknown> } = {
            query: input.query
        };

        const options: Record<string, unknown> = {};

        if (input.path !== undefined) {
            options['path'] = input.path;
        }
        if (input.max_results !== undefined) {
            options['max_results'] = input.max_results;
        }
        if (input.order_by !== undefined) {
            options['order_by'] = input.order_by;
        }
        if (input.file_status !== undefined) {
            options['file_status'] = input.file_status;
        }
        if (input.filename_only !== undefined) {
            options['filename_only'] = input.filename_only;
        }
        if (input.file_extensions !== undefined && input.file_extensions.length > 0) {
            options['file_extensions'] = input.file_extensions;
        }
        if (input.file_categories !== undefined && input.file_categories.length > 0) {
            options['file_categories'] = input.file_categories.map((cat) => ({ '.tag': cat }));
        }

        if (Object.keys(options).length > 0) {
            requestBody['options'] = options;
        }

        let response;

        if (input.cursor) {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-search-continue_v2
            response = await nango.post({
                endpoint: '/2/files/search/continue_v2',
                data: {
                    cursor: input.cursor
                },
                retries: 3
            });
        } else {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-search_v2
            response = await nango.post({
                endpoint: '/2/files/search_v2',
                data: requestBody,
                retries: 3
            });
        }

        const result = OutputSchema.parse(response.data);

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
