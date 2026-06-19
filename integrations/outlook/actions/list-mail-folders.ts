import { z } from 'zod';
import { createAction } from 'nango';

const MailFolderSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().optional(),
    unreadItemCount: z.number().optional(),
    totalItemCount: z.number().optional(),
    wellKnownName: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(MailFolderSchema),
    '@odata.nextLink': z.string().optional()
});

const ListMailFoldersInputSchema = z.object({
    limit: z.number().min(1).max(50).optional().describe('Number of folders to return per page. Max 50.'),
    nextLink: z.string().optional().describe('OData nextLink for pagination from previous response')
});

const ListMailFoldersOutputSchema = z.object({
    folders: z.array(
        z.object({
            id: z.string(),
            displayName: z.string().optional(),
            parentFolderId: z.string().optional(),
            childFolderCount: z.number().optional(),
            unreadItemCount: z.number().optional(),
            totalItemCount: z.number().optional(),
            wellKnownName: z.string().optional()
        })
    ),
    nextLink: z.string().optional().describe('OData nextLink for retrieving the next page')
});

const action = createAction({
    description: 'List top-level mail folders from the mailbox',
    version: '1.0.1',
    input: ListMailFoldersInputSchema,
    output: ListMailFoldersOutputSchema,
    scopes: ['Mail.Read', 'Mail.ReadBasic', 'Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof ListMailFoldersOutputSchema>> => {
        // Microsoft Graph: use the full @odata.nextLink URL for subsequent pages
        // https://learn.microsoft.com/graph/api/user-list-mailfolders
        const endpoint = input.nextLink ?? '/v1.0/me/mailFolders';
        const params: Record<string, string | number> = {};
        if (!input.nextLink && input.limit) {
            params['$top'] = input.limit;
        }
        const response = await nango.get({ endpoint, params, retries: 3 });

        const providerData = ProviderResponseSchema.parse(response.data);

        const folders = providerData.value.map((folder) => ({
            id: folder.id,
            ...(folder.displayName != null && { displayName: folder.displayName }),
            ...(folder.parentFolderId !== undefined && { parentFolderId: folder.parentFolderId }),
            ...(folder.childFolderCount !== undefined && { childFolderCount: folder.childFolderCount }),
            ...(folder.unreadItemCount !== undefined && { unreadItemCount: folder.unreadItemCount }),
            ...(folder.totalItemCount !== undefined && { totalItemCount: folder.totalItemCount }),
            ...(folder.wellKnownName != null && { wellKnownName: folder.wellKnownName })
        }));

        return {
            folders,
            ...(providerData['@odata.nextLink'] !== undefined && { nextLink: providerData['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
