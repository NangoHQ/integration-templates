import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('Location ID to list users for. Example: "AYg6rIXHN1fXdXjGcYvI"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    extension: z.string().optional(),
    permissions: z.record(z.string(), z.boolean()).optional(),
    scopes: z.array(z.string()).optional(),
    roles: z
        .object({
            type: z.string().optional(),
            role: z.string().optional(),
            locationIds: z.array(z.string()).optional(),
            restrictSubAccount: z.boolean().optional()
        })
        .optional(),
    deleted: z.boolean().optional(),
    lcPhone: z.record(z.string(), z.string()).optional(),
    platformLanguage: z.string().optional()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema).optional()
});

const OutputUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    extension: z.string().optional(),
    permissions: z.record(z.string(), z.boolean()).optional(),
    scopes: z.array(z.string()).optional(),
    roles: z
        .object({
            type: z.string().optional(),
            role: z.string().optional(),
            locationIds: z.array(z.string()).optional(),
            restrictSubAccount: z.boolean().optional()
        })
        .optional(),
    deleted: z.boolean().optional(),
    lcPhone: z.record(z.string(), z.string()).optional(),
    platformLanguage: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(OutputUserSchema)
});

const action = createAction({
    description: 'List users assigned to a location in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/7c8f28782a9c8-get-user-by-location
            endpoint: '/users/',
            params: {
                locationId: input.locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from HighLevel API.'
            });
        }

        const users = parsed.data.users ?? [];

        return {
            users: users.map((user) => ({
                id: user.id,
                ...(user.name !== undefined && { name: user.name }),
                ...(user.firstName !== undefined && { firstName: user.firstName }),
                ...(user.lastName !== undefined && { lastName: user.lastName }),
                ...(user.email !== undefined && { email: user.email }),
                ...(user.phone !== undefined && { phone: user.phone }),
                ...(user.extension !== undefined && { extension: user.extension }),
                ...(user.permissions !== undefined && { permissions: user.permissions }),
                ...(user.scopes !== undefined && { scopes: user.scopes }),
                ...(user.roles !== undefined && { roles: user.roles }),
                ...(user.deleted !== undefined && { deleted: user.deleted }),
                ...(user.lcPhone !== undefined && { lcPhone: user.lcPhone }),
                ...(user.platformLanguage !== undefined && { platformLanguage: user.platformLanguage })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
