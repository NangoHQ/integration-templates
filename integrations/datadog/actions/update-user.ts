import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().trim().min(1).describe('User ID. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"'),
    name: z.string().optional().describe('Full name of the user.'),
    email: z.string().optional().describe('Email address of the user.'),
    title: z.string().nullable().optional().describe('Job title of the user.'),
    disabled: z.boolean().optional().describe('Whether the user account is disabled.')
});

const ProviderUserAttributesSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().nullable().optional(),
    disabled: z.boolean().optional(),
    status: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderUserAttributesSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    disabled: z.boolean().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: "Update a user's name, email, title, or disabled status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = {};

        if (input.name !== undefined) {
            attributes['name'] = input.name;
        }
        if (input.email !== undefined) {
            attributes['email'] = input.email;
        }
        if (input.title !== undefined) {
            attributes['title'] = input.title;
        }
        if (input.disabled !== undefined) {
            attributes['disabled'] = input.disabled;
        }

        // https://docs.datadoghq.com/api/latest/users/#update-a-user
        const response = await nango.patch({
            endpoint: `v2/users/${encodeURIComponent(input.userId)}`,
            data: {
                data: {
                    id: input.userId,
                    type: 'users',
                    attributes
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from provider',
                details: parsed.error.issues
            });
        }

        const user = parsed.data.data;
        const attrs = user.attributes || {};

        return {
            id: user.id,
            ...(user.type !== undefined && { type: user.type }),
            ...(attrs.name !== undefined && { name: attrs.name }),
            ...(attrs.email !== undefined && { email: attrs.email }),
            ...(attrs.title != null && { title: attrs.title }),
            ...(attrs.disabled !== undefined && { disabled: attrs.disabled }),
            ...(attrs.status !== undefined && { status: attrs.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
