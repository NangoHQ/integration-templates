import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderUserAttributesSchema = z
    .object({
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        handle: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        title: z.string().nullable().optional()
    })
    .passthrough();

const ProviderUserSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        attributes: ProviderUserAttributesSchema.optional(),
        relationships: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    status: z.string().optional(),
    title: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(OutputUserSchema)
});

const action = createAction({
    description: 'List users in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users_read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/users/#list-all-users
            endpoint: 'v2/users',
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from the users endpoint.'
            });
        }

        const rawBody = z
            .object({
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const providerUsers = rawBody.data.map((item) => ProviderUserSchema.parse(item));

        return {
            users: providerUsers.map((user) => ({
                id: user.id,
                ...(user.attributes?.name != null && { name: user.attributes.name }),
                ...(user.attributes?.email != null && { email: user.attributes.email }),
                ...(user.attributes?.handle != null && { handle: user.attributes.handle }),
                ...(user.attributes?.status != null && { status: user.attributes.status }),
                ...(user.attributes?.title != null && { title: user.attributes.title })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
