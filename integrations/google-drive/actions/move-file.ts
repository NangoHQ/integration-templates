import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to move. Example: "1mD3ukEAmRqo8u0RF_Cr6IJl9f_uWTYH03vesDhB5Svw"'),
    from_folder_id: z.string().describe('The ID of the current parent folder. Example: "1SpnQKJHqNDh-qhbj_zGD2aIm-G-RKC_k"'),
    to_folder_id: z.string().describe('The ID of the destination folder. Example: "1Bl1rB7hkBbdzmKUka3zSj0bhAK3pGypD"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    mimeType: z.union([z.string(), z.null()]),
    parents: z.array(z.string())
});

const action = createAction({
    description: 'Move a file to a different folder',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/move-file',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update
        const response = await nango.patch({
            endpoint: `/drive/v3/files/${input.file_id}`,
            params: {
                addParents: input.to_folder_id,
                removeParents: input.from_folder_id,
                fields: 'id,name,mimeType,parents'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found or could not be moved',
                file_id: input.file_id
            });
        }

        return {
            id: response.data.id,
            name: response.data.name ?? null,
            mimeType: response.data.mimeType ?? null,
            parents: response.data.parents || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
