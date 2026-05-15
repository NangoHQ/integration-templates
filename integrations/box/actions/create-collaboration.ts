import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_type: z.enum(['file', 'folder']).describe('The type of item to grant access to. Example: "folder"'),
    item_id: z.string().describe('The ID of the item to grant access to. Example: "382205380769"'),
    accessible_by_type: z.enum(['user', 'group']).describe('The type of collaborator to invite. Example: "user"'),
    accessible_by_id: z.string().optional().describe('The ID of the user or group to invite. Use this OR accessible_by_login, not both. Example: "23522323"'),
    accessible_by_login: z
        .string()
        .email()
        .optional()
        .describe('The email address of the user to invite. Use this OR accessible_by_id, not both. Example: "john@example.com"'),
    role: z
        .enum(['editor', 'viewer', 'previewer', 'uploader', 'previewer uploader', 'viewer uploader', 'co-owner'])
        .describe('The level of access granted. Example: "editor"'),
    is_access_only: z.boolean().optional().describe('If true, collaborators have access but items are not visible in All Files list. Example: true'),
    can_view_path: z.boolean().optional().describe('If true, invited users can see the entire parent path to the folder. Example: true'),
    expires_at: z.string().datetime().optional().describe('Expiration date for the collaboration in ISO 8601 format. Example: "2019-08-29T23:59:00-07:00"'),
    notify: z.boolean().optional().describe('Whether to notify the user of the invitation. Example: true')
});

const ProviderCollaborationItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional()
});

const ProviderUserCollaborationsSchema = z.object({
    id: z.string(),
    type: z.string(),
    login: z.string().optional(),
    name: z.string().optional()
});

const ProviderCollaborationSchema = z.object({
    id: z.string(),
    type: z.string(),
    item: ProviderCollaborationItemSchema.nullable().optional(),
    accessible_by: ProviderUserCollaborationsSchema.nullable().optional(),
    invite_email: z.string().nullable().optional(),
    role: z.string(),
    expires_at: z.string().nullable().optional(),
    is_access_only: z.boolean().optional(),
    status: z.string().optional(),
    acknowledged_at: z.string().nullable().optional(),
    created_by: ProviderUserCollaborationsSchema.nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    item: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional()
        })
        .optional(),
    accessible_by: z
        .object({
            id: z.string(),
            type: z.string(),
            login: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    invite_email: z.string().optional(),
    role: z.string(),
    expires_at: z.string().optional(),
    is_access_only: z.boolean().optional(),
    status: z.string().optional(),
    acknowledged_at: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Create a collaboration in Box',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-collaboration',
        group: 'Collaborations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.accessible_by_id && !input.accessible_by_login) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either accessible_by_id or accessible_by_login must be provided'
            });
        }

        if (input.accessible_by_id && input.accessible_by_login) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of accessible_by_id or accessible_by_login should be provided, not both'
            });
        }

        const accessibleByData: {
            type: string;
            id?: string;
            login?: string;
        } = {
            type: input.accessible_by_type
        };

        if (input.accessible_by_id) {
            accessibleByData.id = input.accessible_by_id;
        }

        if (input.accessible_by_login) {
            accessibleByData.login = input.accessible_by_login;
        }

        const requestData: {
            item: {
                type: string;
                id: string;
            };
            accessible_by: {
                type: string;
                id?: string;
                login?: string;
            };
            role: string;
            is_access_only?: boolean;
            can_view_path?: boolean;
            expires_at?: string;
        } = {
            item: {
                type: input.item_type,
                id: input.item_id
            },
            accessible_by: accessibleByData,
            role: input.role
        };

        if (input.is_access_only !== undefined) {
            requestData.is_access_only = input.is_access_only;
        }

        if (input.can_view_path !== undefined) {
            requestData.can_view_path = input.can_view_path;
        }

        if (input.expires_at !== undefined) {
            requestData.expires_at = input.expires_at;
        }

        const queryParams: {
            notify?: string;
        } = {};

        if (input.notify !== undefined) {
            queryParams.notify = String(input.notify);
        }

        // https://developer.box.com/reference/post-collaborations/
        const response = await nango.post({
            endpoint: '/2.0/collaborations',
            data: requestData,
            params: queryParams,
            retries: 3
        });

        const collaboration = ProviderCollaborationSchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = {
            id: collaboration.id,
            type: collaboration.type,
            role: collaboration.role,
            ...(collaboration.item != null && {
                item: {
                    id: collaboration.item.id,
                    type: collaboration.item.type,
                    ...(collaboration.item.name != null && { name: collaboration.item.name })
                }
            }),
            ...(collaboration.accessible_by != null && {
                accessible_by: {
                    id: collaboration.accessible_by.id,
                    type: collaboration.accessible_by.type,
                    ...(collaboration.accessible_by.login != null && { login: collaboration.accessible_by.login }),
                    ...(collaboration.accessible_by.name != null && { name: collaboration.accessible_by.name })
                }
            }),
            ...(collaboration.invite_email != null && { invite_email: collaboration.invite_email }),
            ...(collaboration.expires_at != null && { expires_at: collaboration.expires_at }),
            ...(collaboration.is_access_only != null && { is_access_only: collaboration.is_access_only }),
            ...(collaboration.status != null && { status: collaboration.status }),
            ...(collaboration.acknowledged_at != null && { acknowledged_at: collaboration.acknowledged_at }),
            ...(collaboration.created_at != null && { created_at: collaboration.created_at }),
            ...(collaboration.modified_at != null && { modified_at: collaboration.modified_at })
        };

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
