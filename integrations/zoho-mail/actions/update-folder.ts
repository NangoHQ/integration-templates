import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('Folder ID to update. Example: "4845214000000010001"'),
    mode: z.enum(['rename', 'move']).describe('Update mode: rename or move'),
    folderName: z.string().optional().describe('New folder name (required when mode is rename)'),
    parentFolderId: z.string().optional().describe('Destination parent folder ID (used when mode is move)'),
    previousFolderId: z.string().optional().describe('Folder ID to position after in the destination parent (used when mode is move)')
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    })
});

const OutputSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    })
});

const action = createAction({
    description: 'Update (rename or move) a folder in Zoho Mail',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-folder',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.folders.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, string> = {
            mode: input.mode
        };

        if (input.mode === 'rename') {
            if (!input.folderName) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'folderName is required when mode is "rename"'
                });
            }
            body['folderName'] = input.folderName;
        }

        if (input.mode === 'move') {
            if (input.parentFolderId) {
                body['parentFolderId'] = input.parentFolderId;
            }
            if (input.previousFolderId) {
                body['previousFolderId'] = input.previousFolderId;
            }
        }

        // https://www.zoho.com/mail/help/api/put-rename-folder.html
        // https://www.zoho.com/mail/help/api/put-move-folder.html
        const response = await nango.put({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
