import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    status: z.enum(['pending']).optional().describe('The status of the collaborations to retrieve. Defaults to pending.'),
    offset: z.number().int().min(0).optional().describe('The offset of the item at which to begin the response.'),
    limit: z.number().int().min(1).max(1000).optional().describe('The maximum number of items to return per page.')
});

const CollaborationItemSchema = z
    .object({
        id: z.string(),
        type: z.enum(['file', 'folder', 'web_link']),
        name: z.string().optional()
    })
    .passthrough();

const UserCollaborationsSchema = z
    .object({
        id: z.string(),
        type: z.literal('user'),
        name: z.string().optional(),
        login: z.string().optional()
    })
    .passthrough();

const ProviderCollaborationSchema = z
    .object({
        id: z.string(),
        type: z.literal('collaboration'),
        item: CollaborationItemSchema.nullable().optional(),
        accessible_by: UserCollaborationsSchema.nullable().optional(),
        invite_email: z.string().nullable().optional(),
        role: z.string().optional(),
        status: z.enum(['accepted', 'pending', 'rejected']).optional(),
        acknowledged_at: z.string().optional(),
        created_at: z.string().optional(),
        modified_at: z.string().optional()
    })
    .passthrough();

const ProviderCollaborationsResponseSchema = z.object({
    total_count: z.number().int().optional(),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    entries: z.array(ProviderCollaborationSchema)
});

const CollaborationOutputSchema = z.object({
    id: z.string(),
    type: z.literal('collaboration'),
    item: CollaborationItemSchema.nullable().optional(),
    accessible_by: UserCollaborationsSchema.nullable().optional(),
    invite_email: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(['accepted', 'pending', 'rejected']).optional(),
    acknowledged_at: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const OutputSchema = z.object({
    collaborations: z.array(CollaborationOutputSchema),
    total_count: z.number().int().optional(),
    offset: z.number().int().optional(),
    limit: z.number().int().optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List collaborations from Box. Retrieves pending collaboration invites for this user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const status = input.status || 'pending';
        const offset = input.offset || 0;
        const limit = input.limit || 100;

        // https://developer.box.com/reference/get-collaborations/
        const response = await nango.get({
            endpoint: '/2.0/collaborations',
            params: {
                status: status,
                offset: String(offset),
                limit: String(limit)
            },
            retries: 3
        });

        const providerData = ProviderCollaborationsResponseSchema.parse(response.data);

        const collaborations = providerData.entries.map((entry) => ({
            id: entry.id,
            type: entry.type,
            ...(entry.item !== undefined && { item: entry.item }),
            ...(entry.accessible_by !== undefined && { accessible_by: entry.accessible_by }),
            ...(entry.invite_email !== undefined && entry.invite_email !== null && { invite_email: entry.invite_email }),
            ...(entry.role !== undefined && { role: entry.role }),
            ...(entry.status !== undefined && { status: entry.status }),
            ...(entry.acknowledged_at !== undefined && { acknowledged_at: entry.acknowledged_at }),
            ...(entry.created_at !== undefined && { created_at: entry.created_at }),
            ...(entry.modified_at !== undefined && { modified_at: entry.modified_at })
        }));

        const hasMore =
            providerData.total_count !== undefined &&
            providerData.offset !== undefined &&
            providerData.limit !== undefined &&
            providerData.offset + providerData.limit < providerData.total_count;

        return {
            collaborations: collaborations,
            ...(providerData.total_count !== undefined && { total_count: providerData.total_count }),
            ...(providerData.offset !== undefined && { offset: providerData.offset }),
            ...(providerData.limit !== undefined && { limit: providerData.limit }),
            ...(hasMore && { has_more: true })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
