import { z } from 'zod';
import { createAction } from 'nango';

const FolderSchema = z.object({
    folderId: z.string().describe('Folder ID. Example: "b97b86fd-ca82-47d7-8435-f11555c52d0e"'),
    name: z.string().describe('Folder name. Example: "Draft"'),
    type: z.string().describe('Folder type. Example: "draft", "inbox", "sentitems", "recyclebin", "custom"'),
    itemCount: z.string().describe('Number of items in the folder. Example: "5"')
});

const OutputSchema = z.object({
    folders: z.array(FolderSchema)
});

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID. Example: "96bfbc88-de80-40a4-9fb7-f047e656eaaf"')
});

const action = createAction({
    description: 'List all envelope folders for the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-folders'
    },
    input: z.object({}),
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/folders/folders/list/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/folders`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from DocuSign API.'
            });
        }

        const rawData = response.data;
        const foldersList = rawData && typeof rawData === 'object' && 'folders' in rawData ? rawData.folders : undefined;

        if (!Array.isArray(foldersList)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing folders array in DocuSign API response.'
            });
        }

        const parsedFolders = foldersList.map((folder: unknown) => {
            if (!folder || typeof folder !== 'object') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid folder item in DocuSign API response.'
                });
            }

            const folderObj = folder;
            const folderId = folderObj && typeof folderObj === 'object' && 'folderId' in folderObj ? folderObj.folderId : undefined;
            const name = folderObj && typeof folderObj === 'object' && 'name' in folderObj ? folderObj.name : undefined;
            const type = folderObj && typeof folderObj === 'object' && 'type' in folderObj ? folderObj.type : undefined;
            const itemCount = folderObj && typeof folderObj === 'object' && 'itemCount' in folderObj ? folderObj.itemCount : undefined;

            if (typeof folderId !== 'string' || typeof name !== 'string' || typeof type !== 'string' || typeof itemCount !== 'string') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Missing or invalid folder fields in DocuSign API response.'
                });
            }

            return {
                folderId,
                name,
                type,
                itemCount
            };
        });

        return {
            folders: parsedFolders
        };
    }
});

export default action;
