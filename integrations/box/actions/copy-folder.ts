import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The ID of the folder to copy. Example: "382204778319"'),
    destination_folder_id: z.string().describe('The ID of the destination folder where the folder will be copied. Example: "0"'),
    name: z.string().optional().describe('Optional new name for the copied folder. If not provided, the original name will be used with " (copy)" appended.')
});

const ProviderParentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.enum(['folder']).optional()
});

const ProviderFolderSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['folder']),
        parent: ProviderParentSchema.optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional(),
        description: z.string().nullable().optional(),
        size: z.number().optional(),
        sequence_id: z.string().optional(),
        etag: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['folder']),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    description: z.string().optional(),
    size: z.number().optional()
});

const action = createAction({
    description: 'Copy a folder and its contents to a different location in Box.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/post-folders-id-copy/
        const response = await nango.post({
            endpoint: `/2.0/folders/${input.folder_id}/copy`,
            data: {
                parent: {
                    id: input.destination_folder_id
                },
                ...(input.name !== undefined && { name: input.name })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'copy_failed',
                message: 'Failed to copy folder. The source folder may not exist, or you may not have permission to access it.',
                folder_id: input.folder_id
            });
        }

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            type: providerFolder.type,
            ...(providerFolder.parent !== undefined && {
                parent: {
                    id: providerFolder.parent.id,
                    ...(providerFolder.parent.name !== undefined && { name: providerFolder.parent.name })
                }
            }),
            ...(providerFolder.created_at !== undefined && { created_at: providerFolder.created_at }),
            ...(providerFolder.modified_at !== undefined && { modified_at: providerFolder.modified_at }),
            ...(providerFolder.description !== null && providerFolder.description !== undefined && { description: providerFolder.description }),
            ...(providerFolder.size !== undefined && { size: providerFolder.size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
