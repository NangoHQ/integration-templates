import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    collaboration_id: z.string().describe('The ID of the collaboration. Example: "12345678"'),
    role: z
        .enum(['editor', 'viewer', 'previewer', 'uploader', 'previewer uploader', 'viewer uploader', 'co-owner', 'owner'])
        .optional()
        .describe('The level of access granted.'),
    status: z
        .enum(['pending', 'accepted', 'rejected'])
        .optional()
        .describe('Set the status of a pending collaboration invitation, effectively accepting or rejecting the invite.'),
    expires_at: z
        .string()
        .optional()
        .describe('Update the expiration date for the collaboration. Format: ISO 8601 date-time. Example: "2019-08-29T23:59:00-07:00"'),
    can_view_path: z
        .boolean()
        .optional()
        .describe('Determines if the invited users can see the entire parent path to the associated folder. Only for folder collaborations.')
});

const CollaborationItemSchema = z
    .object({
        id: z.string(),
        type: z.enum(['file', 'folder', 'web_link'])
    })
    .passthrough();

const UserCollaborationsSchema = z
    .object({
        id: z.string(),
        type: z.literal('user'),
        name: z.string(),
        login: z.string()
    })
    .passthrough();

const CollaborationSchema = z
    .object({
        id: z.string(),
        type: z.literal('collaboration'),
        item: CollaborationItemSchema.nullable().optional(),
        accessible_by: UserCollaborationsSchema.passthrough().nullable().optional(),
        invite_email: z.string().nullable().optional(),
        role: z.string(),
        expires_at: z.string().nullable().optional(),
        is_access_only: z.boolean().optional(),
        status: z.enum(['accepted', 'pending', 'rejected']),
        acknowledged_at: z.string().nullable().optional(),
        created_by: UserCollaborationsSchema.passthrough().nullable().optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('collaboration'),
    item: z
        .object({
            id: z.string(),
            type: z.enum(['file', 'folder', 'web_link'])
        })
        .passthrough()
        .optional(),
    accessible_by: z
        .object({
            id: z.string(),
            type: z.literal('user'),
            name: z.string(),
            login: z.string()
        })
        .passthrough()
        .nullable()
        .optional(),
    invite_email: z.string().nullable().optional(),
    role: z.string(),
    expires_at: z.string().nullable().optional(),
    is_access_only: z.boolean().optional(),
    status: z.enum(['accepted', 'pending', 'rejected']),
    acknowledged_at: z.string().nullable().optional(),
    created_by: z
        .object({
            id: z.string(),
            type: z.literal('user'),
            name: z.string(),
            login: z.string()
        })
        .passthrough()
        .nullable()
        .optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Update a collaboration in Box',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.role !== undefined) {
            requestBody['role'] = input.role;
        }
        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }
        if (input.expires_at !== undefined) {
            requestBody['expires_at'] = input.expires_at;
        }
        if (input.can_view_path !== undefined) {
            requestBody['can_view_path'] = input.can_view_path;
        }

        if (Object.keys(requestBody).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of role, status, expires_at, or can_view_path must be provided to update the collaboration.'
            });
        }

        // https://developer.box.com/reference/put-collaborations-id/
        const response = await nango.put({
            endpoint: `/2.0/collaborations/${input.collaboration_id}`,
            data: requestBody,
            retries: 3
        });

        if (response.status === 204) {
            throw new nango.ActionError({
                type: 'ownership_changed',
                message:
                    'The role was changed to owner, which deletes the collaboration and creates a new one. The previous owner is now a co-owner. Fetch the new collaboration to get updated details.'
            });
        }

        const collaboration = CollaborationSchema.parse(response.data);

        return {
            id: collaboration.id,
            type: collaboration.type,
            role: collaboration.role,
            status: collaboration.status,
            ...(collaboration.item !== undefined &&
                collaboration.item !== null && {
                    item: collaboration.item
                }),
            ...(collaboration.accessible_by !== undefined && {
                accessible_by: collaboration.accessible_by
            }),
            ...(collaboration.invite_email !== undefined && {
                invite_email: collaboration.invite_email
            }),
            ...(collaboration.expires_at !== undefined && {
                expires_at: collaboration.expires_at
            }),
            ...(collaboration.is_access_only !== undefined && {
                is_access_only: collaboration.is_access_only
            }),
            ...(collaboration.acknowledged_at !== undefined &&
                collaboration.acknowledged_at !== null && {
                    acknowledged_at: collaboration.acknowledged_at
                }),
            ...(collaboration.created_by !== undefined && {
                created_by: collaboration.created_by
            }),
            ...(collaboration.created_at !== undefined && {
                created_at: collaboration.created_at
            }),
            ...(collaboration.modified_at !== undefined && {
                modified_at: collaboration.modified_at
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
