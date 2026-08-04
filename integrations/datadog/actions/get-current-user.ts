import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderRelationshipDataSchema = z.object({
    type: z.string().optional(),
    id: z.string()
});

const ProviderUserAttributesSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    title: z.string().nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    status: z.string().optional(),
    icon: z.string().nullable().optional()
});

const ProviderRelationshipsSchema = z.object({
    org: z
        .object({
            data: ProviderRelationshipDataSchema.optional()
        })
        .optional(),
    roles: z
        .object({
            data: z.array(ProviderRelationshipDataSchema).optional()
        })
        .optional()
});

const ProviderUserSchema = z.object({
    type: z.string().optional(),
    id: z.string(),
    attributes: ProviderUserAttributesSchema.optional(),
    relationships: ProviderRelationshipsSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderUserSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    status: z.string().optional(),
    icon: z.string().optional(),
    org_id: z.string().optional(),
    role_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Get the profile of the user this connection authenticates as, including org/role relationships.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users_read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/users/#get-the-current-user
            endpoint: 'v2/current_user',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const user = providerResponse.data;

        if (!user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Current user not found'
            });
        }

        const attrs = user.attributes;
        const rels = user.relationships;
        const orgData = rels?.org?.data;
        const rolesData = rels?.roles?.data;

        return {
            id: user.id,
            type: user.type,
            ...(attrs?.name !== undefined && { name: attrs.name }),
            ...(attrs?.email !== undefined && { email: attrs.email }),
            ...(attrs?.handle !== undefined && { handle: attrs.handle }),
            ...(attrs?.title != null && { title: attrs.title }),
            ...(attrs?.created_at !== undefined && { created_at: attrs.created_at }),
            ...(attrs?.modified_at !== undefined && { modified_at: attrs.modified_at }),
            ...(attrs?.status !== undefined && { status: attrs.status }),
            ...(attrs?.icon != null && { icon: attrs.icon }),
            ...(orgData !== undefined && { org_id: orgData.id }),
            ...(rolesData !== undefined && { role_ids: rolesData.map((r) => r.id) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
