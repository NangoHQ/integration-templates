import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The unique identifier of the file. Example: "12345"')
});

const ProviderUserMiniSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    login: z.string().optional()
});

const ProviderFolderMiniSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional()
});

const ProviderFileSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        size: z.number(),
        created_at: z.string(),
        modified_at: z.string(),
        description: z.string().optional().nullable(),
        etag: z.string().optional(),
        parent: ProviderFolderMiniSchema.optional(),
        created_by: ProviderUserMiniSchema.optional(),
        modified_by: ProviderUserMiniSchema.optional(),
        owned_by: ProviderUserMiniSchema.optional(),
        item_status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    size: z.number(),
    created_at: z.string(),
    modified_at: z.string(),
    description: z.string().optional(),
    etag: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional()
        })
        .optional(),
    created_by: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            login: z.string().optional()
        })
        .optional(),
    modified_by: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            login: z.string().optional()
        })
        .optional(),
    owned_by: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            login: z.string().optional()
        })
        .optional(),
    item_status: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single file from Box',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/get-files-id/
        const response = await nango.get({
            endpoint: `/2.0/files/${input.file_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found',
                file_id: input.file_id
            });
        }

        const providerFile = ProviderFileSchema.parse(response.data);

        return {
            id: providerFile.id,
            type: providerFile.type,
            name: providerFile.name,
            size: providerFile.size,
            created_at: providerFile.created_at,
            modified_at: providerFile.modified_at,
            ...(providerFile.description != null && { description: providerFile.description }),
            ...(providerFile.etag !== undefined && { etag: providerFile.etag }),
            ...(providerFile.parent !== undefined && {
                parent: {
                    id: providerFile.parent.id,
                    type: providerFile.parent.type,
                    ...(providerFile.parent.name !== undefined && { name: providerFile.parent.name })
                }
            }),
            ...(providerFile.created_by !== undefined && {
                created_by: {
                    id: providerFile.created_by.id,
                    type: providerFile.created_by.type,
                    name: providerFile.created_by.name,
                    ...(providerFile.created_by.login !== undefined && { login: providerFile.created_by.login })
                }
            }),
            ...(providerFile.modified_by !== undefined && {
                modified_by: {
                    id: providerFile.modified_by.id,
                    type: providerFile.modified_by.type,
                    name: providerFile.modified_by.name,
                    ...(providerFile.modified_by.login !== undefined && { login: providerFile.modified_by.login })
                }
            }),
            ...(providerFile.owned_by !== undefined && {
                owned_by: {
                    id: providerFile.owned_by.id,
                    type: providerFile.owned_by.type,
                    name: providerFile.owned_by.name,
                    ...(providerFile.owned_by.login !== undefined && { login: providerFile.owned_by.login })
                }
            }),
            ...(providerFile.item_status !== undefined && { item_status: providerFile.item_status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
