import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the folder. Example: "My New Folder"'),
    parent_folder_id: z.string().describe('The ID of the parent folder. Use "0" for the root folder. Example: "382205380769"')
});

const ProviderFolderSchema = z.object({
    type: z.literal('folder'),
    id: z.string(),
    sequence_id: z.string(),
    etag: z.string(),
    name: z.string(),
    created_at: z.string(),
    modified_at: z.string(),
    description: z.string().optional(),
    size: z.number(),
    path_collection: z.object({
        total_count: z.number(),
        entries: z.array(
            z.object({
                type: z.string(),
                id: z.string(),
                sequence_id: z.string().nullable(),
                etag: z.string().nullable(),
                name: z.string()
            })
        )
    }),
    created_by: z
        .object({
            type: z.string(),
            id: z.string(),
            name: z.string(),
            login: z.string()
        })
        .optional(),
    modified_by: z
        .object({
            type: z.string(),
            id: z.string(),
            name: z.string(),
            login: z.string()
        })
        .optional(),
    owned_by: z
        .object({
            type: z.string(),
            id: z.string(),
            name: z.string(),
            login: z.string()
        })
        .optional(),
    shared_link: z.unknown().nullable().optional(),
    folder_upload_email: z.unknown().nullable().optional(),
    parent: z
        .object({
            type: z.string(),
            id: z.string(),
            sequence_id: z.string().nullable(),
            etag: z.string().nullable(),
            name: z.string()
        })
        .optional(),
    item_status: z.string().optional(),
    item_collection: z
        .object({
            total_count: z.number(),
            entries: z.array(z.unknown()),
            offset: z.number(),
            limit: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the folder'),
    name: z.string().describe('The name of the folder'),
    type: z.literal('folder').describe('The type of the item'),
    parent_id: z.string().optional().describe('The ID of the parent folder'),
    created_at: z.string().optional().describe('The timestamp when the folder was created'),
    modified_at: z.string().optional().describe('The timestamp when the folder was last modified'),
    description: z.string().optional().describe('The description of the folder'),
    path_collection: z
        .object({
            entries: z.array(
                z.object({
                    id: z.string(),
                    name: z.string()
                })
            )
        })
        .optional()
        .describe('The path from the root to this folder')
});

const action = createAction({
    description: 'Create a folder in Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/post-folders/
        const response = await nango.post({
            endpoint: '/2.0/folders',
            data: {
                name: input.name,
                parent: {
                    id: input.parent_folder_id
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create folder: empty response from Box API'
            });
        }

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name,
            type: providerFolder.type,
            ...(providerFolder.parent && { parent_id: providerFolder.parent.id }),
            ...(providerFolder.created_at && { created_at: providerFolder.created_at }),
            ...(providerFolder.modified_at && { modified_at: providerFolder.modified_at }),
            ...(providerFolder.description && { description: providerFolder.description }),
            ...(providerFolder.path_collection && {
                path_collection: {
                    entries: providerFolder.path_collection.entries.map((entry) => ({
                        id: entry.id,
                        name: entry.name
                    }))
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
