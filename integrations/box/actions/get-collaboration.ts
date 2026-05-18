import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    collaboration_id: z.string().describe('The ID of the collaboration. Example: "1234"')
});

const ProviderCollaborationSchema = z.object({
    id: z.string(),
    type: z.literal('collaboration'),
    item: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    accessible_by: z
        .object({
            id: z.string(),
            type: z.string(),
            login: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    invite_email: z.string().optional().nullable(),
    role: z.string(),
    expires_at: z.string().optional().nullable(),
    is_access_only: z.boolean().optional(),
    status: z.enum(['accepted', 'pending', 'rejected']),
    acknowledged_at: z.string().optional().nullable(),
    created_by: z
        .object({
            id: z.string(),
            type: z.string(),
            login: z.string(),
            name: z.string()
        })
        .optional(),
    created_at: z.string(),
    modified_at: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('collaboration'),
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
    status: z.enum(['accepted', 'pending', 'rejected']),
    acknowledged_at: z.string().optional(),
    created_by: z
        .object({
            id: z.string(),
            type: z.string(),
            login: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    created_at: z.string(),
    modified_at: z.string()
});

const action = createAction({
    description: 'Retrieve a single collaboration from Box.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-collaboration',
        group: 'Collaborations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/get-collaborations-id/
        const response = await nango.get({
            endpoint: `/2.0/collaborations/${input.collaboration_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Collaboration not found',
                collaboration_id: input.collaboration_id
            });
        }

        const collaboration = ProviderCollaborationSchema.parse(response.data);

        return {
            id: collaboration.id,
            type: collaboration.type,
            ...(collaboration.item && {
                item: {
                    id: collaboration.item.id,
                    type: collaboration.item.type,
                    ...(collaboration.item.name && { name: collaboration.item.name })
                }
            }),
            ...(collaboration.accessible_by && {
                accessible_by: {
                    id: collaboration.accessible_by.id,
                    type: collaboration.accessible_by.type,
                    ...(collaboration.accessible_by.login && { login: collaboration.accessible_by.login }),
                    ...(collaboration.accessible_by.name && { name: collaboration.accessible_by.name })
                }
            }),
            ...(collaboration.invite_email != null && { invite_email: collaboration.invite_email }),
            role: collaboration.role,
            ...(collaboration.expires_at != null && { expires_at: collaboration.expires_at }),
            ...(collaboration.is_access_only !== undefined && { is_access_only: collaboration.is_access_only }),
            status: collaboration.status,
            ...(collaboration.acknowledged_at && { acknowledged_at: collaboration.acknowledged_at }),
            ...(collaboration.created_by && {
                created_by: {
                    id: collaboration.created_by.id,
                    type: collaboration.created_by.type,
                    ...(collaboration.created_by.login && { login: collaboration.created_by.login }),
                    ...(collaboration.created_by.name && { name: collaboration.created_by.name })
                }
            }),
            created_at: collaboration.created_at,
            modified_at: collaboration.modified_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
