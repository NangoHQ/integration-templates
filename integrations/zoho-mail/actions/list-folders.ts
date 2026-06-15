import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"')
});

const ProviderFolderSchema = z.object({
    path: z.string(),
    previousFolderId: z.string().optional(),
    isArchived: z.number(),
    folderName: z.string(),
    imapAccess: z.boolean(),
    folderType: z.string(),
    URI: z.string(),
    folderId: z.string()
});

const FolderSchema = z.object({
    folderId: z.string(),
    folderName: z.string(),
    folderType: z.string(),
    path: z.string(),
    previousFolderId: z.string().optional(),
    isArchived: z.number(),
    imapAccess: z.boolean(),
    uri: z.string()
});

const OutputSchema = z.object({
    folders: z.array(FolderSchema)
});

const action = createAction({
    description: 'List all folders for an account in Zoho Mail',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-folders',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.folders.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-all-folder-details.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders`,
            retries: 3
        });

        const providerResponse = z
            .object({
                status: z.object({
                    code: z.number(),
                    description: z.string()
                }),
                data: z.array(ProviderFolderSchema)
            })
            .parse(response.data);

        if (providerResponse.status.code !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.status.description
            });
        }

        return {
            folders: providerResponse.data.map((folder) => ({
                folderId: folder.folderId,
                folderName: folder.folderName,
                folderType: folder.folderType,
                path: folder.path,
                ...(folder.previousFolderId !== undefined && { previousFolderId: folder.previousFolderId }),
                isArchived: folder.isArchived,
                imapAccess: folder.imapAccess,
                uri: folder.URI
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
