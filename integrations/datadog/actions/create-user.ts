import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the user. Example: "user@example.com"'),
    name: z.string().optional().describe('Name of the user. Example: "John Doe"'),
    title: z.string().optional().describe('Title of the user. Example: "Engineer"')
});

const ProviderRoleDataSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderUserAttributesSchema = z.object({
    email: z.string(),
    name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    disabled: z.boolean().optional()
});

const ProviderUserRelationshipsSchema = z.object({
    roles: z
        .object({
            data: z.array(ProviderRoleDataSchema)
        })
        .optional()
});

const ProviderUserDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderUserAttributesSchema,
    relationships: ProviderUserRelationshipsSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderUserDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    disabled: z.boolean().optional(),
    roles: z
        .array(
            z.object({
                id: z.string(),
                type: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a new user (invited by email) in this account.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/users/#create-a-user
        const response = await nango.post({
            endpoint: 'v2/users',
            data: {
                data: {
                    type: 'users',
                    attributes: {
                        email: input.email,
                        ...(input.name !== undefined && { name: input.name }),
                        ...(input.title !== undefined && { title: input.title })
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const attrs = parsed.data.attributes;
        const roles = parsed.data.relationships?.roles?.data ?? [];

        return {
            id: parsed.data.id,
            email: attrs.email,
            ...(attrs.name != null && { name: attrs.name }),
            ...(attrs.title != null && { title: attrs.title }),
            ...(attrs.status !== undefined && { status: attrs.status }),
            ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
            ...(attrs.modified_at !== undefined && { modified_at: attrs.modified_at }),
            ...(attrs.disabled !== undefined && { disabled: attrs.disabled }),
            ...(roles.length > 0 && { roles })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
