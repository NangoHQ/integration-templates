/**
 * Lists files in a workspace with optional filtering.
 *
 * API: https://api.slack.com/methods/files.list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Response type for file objects from Slack API
interface SlackFile {
    id: string;
    name?: string;
    title?: string;
    mimetype?: string;
    filetype?: string;
    size?: number;
    created?: number;
    timestamp?: number;
}

const ListFilesInput = z.object({
    channel_id: z.string().optional().describe('Filter by channel. Example: "C02MB5ZABA7"'),
    user_id: z.string().optional().describe('Filter by user who created the file. Example: "U02MDCKS1N0"'),
    types: z.string().optional().describe('Filter by file types. Example: "images,pdfs"'),
    count: z.number().optional().describe('Number of files to return per page. Default: 100'),
    page: z.number().optional().describe('Page number of results. Default: 1')
});

const FileSchema = z.object({
    id: z.string().describe('The file ID'),
    name: z.union([z.string(), z.null()]).describe('The filename'),
    title: z.union([z.string(), z.null()]).describe('The file title'),
    mimetype: z.union([z.string(), z.null()]).describe('The MIME type'),
    filetype: z.union([z.string(), z.null()]).describe('The file type extension'),
    size: z.union([z.number(), z.null()]).describe('File size in bytes'),
    created: z.union([z.number(), z.null()]).describe('Unix timestamp when file was created'),
    timestamp: z.union([z.number(), z.null()]).describe('Unix timestamp of the file')
});

const PagingSchema = z.object({
    count: z.number().describe('Number of files per page'),
    total: z.number().describe('Total number of files'),
    page: z.number().describe('Current page number'),
    pages: z.number().describe('Total number of pages')
});

const ListFilesOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    files: z.array(FileSchema).describe('Array of file objects'),
    paging: PagingSchema.describe('Pagination information')
});

const action = createAction({
    description: 'Lists files in a workspace with optional filtering.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/files/list',
        group: 'Files'
    },

    input: ListFilesInput,
    output: ListFilesOutput,
    scopes: ['files:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListFilesOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/files.list
            endpoint: 'files.list',
            params: {
                ...(input.channel_id && { channel: input.channel_id }),
                ...(input.user_id && { user: input.user_id }),
                ...(input.types && { types: input.types }),
                ...(input.count && { count: input.count.toString() }),
                ...(input.page && { page: input.page.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            files: response.data.files.map((file: SlackFile) => ({
                id: file.id,
                name: file.name ?? null,
                title: file.title ?? null,
                mimetype: file.mimetype ?? null,
                filetype: file.filetype ?? null,
                size: file.size ?? null,
                created: file.created ?? null,
                timestamp: file.timestamp ?? null
            })),
            paging: {
                count: response.data.paging.count,
                total: response.data.paging.total,
                page: response.data.paging.page,
                pages: response.data.paging.pages
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
