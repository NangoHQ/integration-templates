import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z
        .string()
        .describe(
            'The ID of the mail folder to list children for. Example: "AAMkAGVmODUyMzE1LTM0MDctNDNlMS05YjQ1LTI4MjE5MjJmYzY1ZgAuAAAAAADY3h3zQIGrQ6Pm8GPMwoNdAQCr0pwLSY4vT6AX1L4UHn_uAAAAAAEJAAA="'
        ),
    limit: z.number().optional().describe('Maximum number of folders to return per page. Default is 10.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (@odata.nextLink). Omit for the first page.')
});

const ProviderMailFolderSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().optional(),
    unreadItemCount: z.number().optional(),
    totalItemCount: z.number().optional(),
    sizeInBytes: z.number().optional(),
    isHidden: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderMailFolderSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputFolderSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().optional(),
    unreadItemCount: z.number().optional(),
    totalItemCount: z.number().optional(),
    sizeInBytes: z.number().optional(),
    isHidden: z.boolean().optional()
});

const OutputSchema = z.object({
    folders: z.array(OutputFolderSchema),
    next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Absent if there are no more pages.')
});

const action = createAction({
    description: 'List child folders under a mail folder',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-mail-folder-children',
        group: 'Mail Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Read', 'Mail.ReadBasic', 'Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 10;

        // https://learn.microsoft.com/graph/api/mailfolder-list-childfolders
        const response = await nango.get({
            endpoint: `/v1.0/me/mailFolders/${encodeURIComponent(input.folderId)}/childFolders`,
            params: {
                $top: String(limit),
                ...(input.cursor && { $skiptoken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        // Extract skip token from @odata.nextLink if present
        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink']) {
            const nextLink = providerResponse['@odata.nextLink'];
            const skipTokenMatch = nextLink.match(/[$&?]skiptoken=([^&]*)/);
            if (skipTokenMatch && skipTokenMatch[1]) {
                nextCursor = decodeURIComponent(skipTokenMatch[1]);
            }
        }

        return {
            folders: providerResponse.value.map((folder) => ({
                id: folder.id,
                ...(folder.displayName != null && { displayName: folder.displayName }),
                ...(folder.parentFolderId !== undefined && { parentFolderId: folder.parentFolderId }),
                ...(folder.childFolderCount !== undefined && { childFolderCount: folder.childFolderCount }),
                ...(folder.unreadItemCount !== undefined && { unreadItemCount: folder.unreadItemCount }),
                ...(folder.totalItemCount !== undefined && { totalItemCount: folder.totalItemCount }),
                ...(folder.sizeInBytes !== undefined && { sizeInBytes: folder.sizeInBytes }),
                ...(folder.isHidden !== undefined && { isHidden: folder.isHidden })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
