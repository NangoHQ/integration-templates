import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parentFolderId: z.string().describe('The unique identifier of the parent mail folder. Example: "AQMkAGI2..."'),
    displayName: z.string().describe('The display name of the new mail folder. Example: "Work"'),
    hidden: z.boolean().optional().describe('Whether the folder should be hidden from standard folder lists.')
});

const ProviderMailFolderSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().optional(),
    unreadItemCount: z.number().optional(),
    totalItemCount: z.number().optional(),
    isHidden: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().optional(),
    unreadItemCount: z.number().optional(),
    totalItemCount: z.number().optional(),
    isHidden: z.boolean().optional()
});

const action = createAction({
    description: 'Create a child mail folder in Outlook.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.ReadWrite', 'Mail.ReadWrite.Shared'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type RequestBody = {
            displayName: string;
            isHidden?: boolean;
        };

        const requestBody: RequestBody = {
            displayName: input.displayName
        };

        if (input.hidden !== undefined) {
            requestBody.isHidden = input.hidden;
        }

        // https://learn.microsoft.com/graph/api/mailfolder-post-childfolders
        const response = await nango.post({
            endpoint: `/v1.0/me/mailFolders/${encodeURIComponent(input.parentFolderId)}/childFolders`,
            data: requestBody,
            retries: 3
        });

        const providerFolder = ProviderMailFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            displayName: providerFolder.displayName,
            parentFolderId: providerFolder.parentFolderId,
            childFolderCount: providerFolder.childFolderCount,
            unreadItemCount: providerFolder.unreadItemCount,
            totalItemCount: providerFolder.totalItemCount,
            isHidden: providerFolder.isHidden
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
