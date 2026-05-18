import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The unique identifier for the folder to update. Example: "12345"'),
    name: z.string().optional().describe('The new name for the folder.'),
    description: z.string().max(256).optional().describe('The optional description of this folder.'),
    parent_id: z.string().optional().describe('The ID of the new parent folder to move this folder into.'),
    tags: z.array(z.string()).min(1).max(100).optional().describe('The tags for this item.'),
    can_non_owners_invite: z.boolean().optional().describe('Specifies if users who are not the owner of the folder can invite new collaborators.'),
    is_collaboration_restricted_to_enterprise: z
        .boolean()
        .optional()
        .describe('Specifies if new invites to this folder are restricted to users within the enterprise.'),
    can_non_owners_view_collaborators: z
        .boolean()
        .optional()
        .describe('Restricts collaborators who are not the owner from viewing other collaborations on this folder.')
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    sync_state: z.enum(['synced', 'not_synced', 'partially_synced']).optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    can_non_owners_invite: z.boolean().optional().nullable(),
    is_collaboration_restricted_to_enterprise: z.boolean().optional().nullable(),
    can_non_owners_view_collaborators: z.boolean().optional().nullable(),
    sequence_id: z.unknown().optional().nullable(),
    etag: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    modified_at: z.string().optional().nullable(),
    owned_by: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    path_collection: z
        .object({
            entries: z.array(
                z.object({
                    id: z.string(),
                    type: z.string(),
                    name: z.string().optional()
                })
            ),
            total_count: z.number().optional()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
    parent_id: z.string().optional(),
    sync_state: z.enum(['synced', 'not_synced', 'partially_synced']).optional(),
    tags: z.array(z.string()).optional(),
    can_non_owners_invite: z.boolean().optional(),
    is_collaboration_restricted_to_enterprise: z.boolean().optional(),
    can_non_owners_view_collaborators: z.boolean().optional()
});

const action = createAction({
    description: 'Update a folder in Box.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-folder',
        group: 'Folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.parent_id !== undefined && { parent: { id: input.parent_id } }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.can_non_owners_invite !== undefined && { can_non_owners_invite: input.can_non_owners_invite }),
            ...(input.is_collaboration_restricted_to_enterprise !== undefined && {
                is_collaboration_restricted_to_enterprise: input.is_collaboration_restricted_to_enterprise
            }),
            ...(input.can_non_owners_view_collaborators !== undefined && {
                can_non_owners_view_collaborators: input.can_non_owners_view_collaborators
            })
        };

        // https://developer.box.com/reference/put-folders-id/
        const response = await nango.put({
            endpoint: `/2.0/folders/${input.folder_id}`,
            data: requestBody,
            retries: 3
        });

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            type: providerFolder.type,
            name: providerFolder.name,
            ...(providerFolder.description != null && { description: providerFolder.description }),
            ...(providerFolder.parent != null && { parent_id: providerFolder.parent.id }),
            ...(providerFolder.sync_state != null && { sync_state: providerFolder.sync_state }),
            ...(providerFolder.tags != null && { tags: providerFolder.tags }),
            ...(providerFolder.can_non_owners_invite != null && { can_non_owners_invite: providerFolder.can_non_owners_invite }),
            ...(providerFolder.is_collaboration_restricted_to_enterprise != null && {
                is_collaboration_restricted_to_enterprise: providerFolder.is_collaboration_restricted_to_enterprise
            }),
            ...(providerFolder.can_non_owners_view_collaborators != null && {
                can_non_owners_view_collaborators: providerFolder.can_non_owners_view_collaborators
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
