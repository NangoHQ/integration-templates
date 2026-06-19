import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to copy. Example: "123456789"'),
    parent_folder_id: z.string().describe('The ID of the destination folder. Example: "987654321"'),
    name: z.string().optional().describe('An optional new name for the copied file. If not provided, the original name is used.')
});

const BoxFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    parent_folder_id: z.string().optional()
});

const action = createAction({
    description: 'Copy a file to a different folder in Box.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { parent: { id: string }; name?: string } = {
            parent: {
                id: input.parent_folder_id
            }
        };

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }

        const response = await nango.post({
            // https://developer.box.com/reference/post-files-id-copy/
            endpoint: `/2.0/files/${input.file_id}/copy`,
            data: requestBody,
            retries: 3
        });

        const boxFile = BoxFileSchema.parse(response.data);

        return {
            id: boxFile.id,
            name: boxFile.name,
            type: boxFile.type,
            ...(boxFile.description != null && { description: boxFile.description }),
            ...(boxFile.size !== undefined && { size: boxFile.size }),
            ...(boxFile.created_at !== undefined && { created_at: boxFile.created_at }),
            ...(boxFile.modified_at !== undefined && { modified_at: boxFile.modified_at }),
            ...(boxFile.parent !== undefined && { parent_folder_id: boxFile.parent.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
