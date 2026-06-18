import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The unique identifier that represent a folder. The root folder is always represented by the ID 0. Example: "12345"')
});

const UserMiniSchema = z.object({
    type: z.literal('user'),
    id: z.string(),
    name: z.string(),
    login: z.string().optional()
});

const FolderMiniSchema = z.object({
    type: z.literal('folder'),
    id: z.string(),
    sequence_id: z.string().nullable().optional(),
    etag: z.string().nullable().optional(),
    name: z.string()
});

const SharedLinkSchema = z.object({
    url: z.string(),
    download_url: z.string().nullable().optional(),
    vanity_url: z.string().nullable().optional(),
    vanity_name: z.string().nullable().optional(),
    access: z.string().optional(),
    effective_access: z.string().optional(),
    effective_permission: z.string().optional(),
    is_password_enabled: z.boolean().optional(),
    download_count: z.number().optional(),
    preview_count: z.number().optional()
});

const FolderUploadEmailSchema = z.object({
    access: z.string(),
    email: z.string()
});

const ItemCollectionOrderSchema = z.object({
    by: z.string(),
    direction: z.string()
});

const ItemEntrySchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
    sequence_id: z.string().nullable().optional(),
    etag: z.string().nullable().optional()
});

const ItemCollectionSchema = z.object({
    total_count: z.number(),
    entries: z.array(ItemEntrySchema),
    offset: z.number().optional(),
    limit: z.number().optional(),
    order: z.array(ItemCollectionOrderSchema).optional()
});

const PathCollectionSchema = z.object({
    total_count: z.number(),
    entries: z.array(FolderMiniSchema)
});

const PermissionsSchema = z.object({
    can_delete: z.boolean().optional(),
    can_download: z.boolean().optional(),
    can_invite_collaborator: z.boolean().optional(),
    can_rename: z.boolean().optional(),
    can_set_share_access: z.boolean().optional(),
    can_share: z.boolean().optional(),
    can_upload: z.boolean().optional(),
    can_apply_watermark: z.boolean().optional()
});

const OutputSchema = z.object({
    type: z.literal('folder'),
    id: z.string(),
    sequence_id: z.string().nullable().optional(),
    etag: z.string().nullable().optional(),
    name: z.string(),
    created_at: z.string().nullable().optional(),
    modified_at: z.string().nullable().optional(),
    description: z.string().optional(),
    size: z.number().optional(),
    path_collection: PathCollectionSchema.optional(),
    created_by: UserMiniSchema.optional(),
    modified_by: UserMiniSchema.optional(),
    trashed_at: z.string().nullable().optional(),
    purged_at: z.string().nullable().optional(),
    content_created_at: z.string().nullable().optional(),
    content_modified_at: z.string().nullable().optional(),
    owned_by: UserMiniSchema.optional(),
    shared_link: SharedLinkSchema.nullable().optional(),
    folder_upload_email: FolderUploadEmailSchema.nullable().optional(),
    parent: FolderMiniSchema.nullable().optional(),
    item_status: z.string().optional(),
    item_collection: ItemCollectionSchema.optional(),
    has_collaborations: z.boolean().optional(),
    permissions: PermissionsSchema.optional(),
    tags: z.array(z.string()).optional(),
    can_non_owners_invite: z.boolean().optional(),
    is_externally_owned: z.boolean().optional(),
    is_collaboration_restricted_to_enterprise: z.boolean().optional(),
    allowed_shared_link_access_levels: z.array(z.string()).optional(),
    allowed_invitee_roles: z.array(z.string()).optional(),
    watermark_info: z
        .object({
            is_watermarked: z.boolean(),
            is_watermark_inherited: z.boolean().optional(),
            is_watermarked_by_access_policy: z.boolean().optional()
        })
        .optional(),
    is_accessible_via_shared_link: z.boolean().optional(),
    can_non_owners_view_collaborators: z.boolean().optional(),
    classification: z
        .object({
            name: z.string().optional(),
            definition: z.string().optional(),
            color: z.string().optional()
        })
        .nullable()
        .optional(),
    is_associated_with_app_item: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single folder from Box.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/get-folders-id/
        const response = await nango.get({
            endpoint: `/2.0/folders/${input.folder_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Folder not found',
                folder_id: input.folder_id
            });
        }

        const folder = OutputSchema.parse(response.data);
        return folder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
