import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID. Example: "4845214000000008008"')
});

const ProviderFolderSchema = z.object({
    path: z.string().optional(),
    previousFolderId: z.string().optional(),
    isArchived: z.number().optional(),
    folderName: z.string().optional(),
    imapAccess: z.boolean().optional(),
    folderType: z.string().optional(),
    URI: z.string().optional(),
    folderId: z.string().optional()
});

const OutputSchema = z.object({
    folderId: z.string().optional(),
    folderName: z.string().optional(),
    folderType: z.string().optional(),
    path: z.string().optional(),
    previousFolderId: z.string().optional(),
    isArchived: z.number().optional(),
    imapAccess: z.boolean().optional(),
    URI: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single folder from Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-folder',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.folders.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-single-folder-details.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}`,
            retries: 3
        });

        const data = response.data;
        if (data === null || data === undefined || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Mail API.'
            });
        }

        const outerResponse = z
            .object({
                data: z.unknown()
            })
            .safeParse(data);

        if (!outerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Zoho Mail API.'
            });
        }

        const folderData = ProviderFolderSchema.parse(outerResponse.data.data);
        return {
            ...(folderData.folderId !== undefined && { folderId: folderData.folderId }),
            ...(folderData.folderName !== undefined && { folderName: folderData.folderName }),
            ...(folderData.folderType !== undefined && { folderType: folderData.folderType }),
            ...(folderData.path !== undefined && { path: folderData.path }),
            ...(folderData.previousFolderId !== undefined && { previousFolderId: folderData.previousFolderId }),
            ...(folderData.isArchived !== undefined && { isArchived: folderData.isArchived }),
            ...(folderData.imapAccess !== undefined && { imapAccess: folderData.imapAccess }),
            ...(folderData.URI !== undefined && { URI: folderData.URI })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
