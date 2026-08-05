import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    userId: z.string().trim().min(1).describe('User ID. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"')
});

const ProviderUserAttributesSchema = z.object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    handle: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    disabled: z.boolean().nullable().optional()
});

const ProviderUserDataSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderUserAttributesSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderUserDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    disabled: z.boolean().optional()
});

const action = createAction({
    description: 'Get a single user by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/users/#get-a-user
            endpoint: `v2/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attributes = providerResponse.data.attributes || {};

        return {
            id: providerResponse.data.id,
            ...(attributes.name != null && { name: attributes.name }),
            ...(attributes.email != null && { email: attributes.email }),
            ...(attributes.handle != null && { handle: attributes.handle }),
            ...(attributes.title != null && { title: attributes.title }),
            ...(attributes.status != null && { status: attributes.status }),
            ...(attributes.disabled != null && { disabled: attributes.disabled })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
