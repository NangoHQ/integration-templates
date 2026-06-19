import { z } from 'zod';
import { createAction } from 'nango';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderName: z.string().describe('Name of the folder to create. Example: "My Folder"'),
    parentFolderId: z.string().optional().describe('Optional parent folder ID. Example: "4845214000000008008"')
});

const ProviderFolderSchema = z.object({
    folderId: z.string(),
    folderName: z.string(),
    path: z.string().optional(),
    folderType: z.string().optional(),
    isArchived: z.number().optional(),
    imapAccess: z.boolean().optional(),
    previousFolderId: z.string().optional(),
    URI: z.string().optional()
});

const OutputSchema = ProviderFolderSchema;

const action = createAction({
    description: 'Create a folder in Zoho Mail',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.folders.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            folderName: input.folderName
        };

        if (input.parentFolderId !== undefined) {
            requestBody['parentFolderId'] = input.parentFolderId;
        }

        // https://www.zoho.com/mail/help/api/post-create-new-folder.html
        const response = await nango.post({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders`,
            data: requestBody,
            retries: 3
        });

        const responseData = response.data;
        if (!isRecord(responseData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Mail API'
            });
        }

        const rawData = responseData['data'];

        if (!isRecord(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing folder data in response'
            });
        }

        const providerFolder = ProviderFolderSchema.parse(rawData);

        return {
            folderId: providerFolder.folderId,
            folderName: providerFolder.folderName,
            ...(providerFolder.path !== undefined && { path: providerFolder.path }),
            ...(providerFolder.folderType !== undefined && { folderType: providerFolder.folderType }),
            ...(providerFolder.isArchived !== undefined && { isArchived: providerFolder.isArchived }),
            ...(providerFolder.imapAccess !== undefined && { imapAccess: providerFolder.imapAccess }),
            ...(providerFolder.previousFolderId !== undefined && { previousFolderId: providerFolder.previousFolderId }),
            ...(providerFolder.URI !== undefined && { URI: providerFolder.URI })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
