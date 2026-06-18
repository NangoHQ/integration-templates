import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to retrieve. Example: "123456"')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    url: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    time_zone: z.string().optional(),
    iana_time_zone: z.string().optional(),
    phone: z.string().nullable().optional(),
    locale: z.string().optional(),
    locale_id: z.number().optional(),
    organization_id: z.number().nullable().optional(),
    role: z.string().optional(),
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
    suspended: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    url: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    timeZone: z.string().optional(),
    ianaTimeZone: z.string().optional(),
    phone: z.string().optional(),
    locale: z.string().optional(),
    localeId: z.number().optional(),
    organizationId: z.number().optional(),
    role: z.string().optional(),
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
    suspended: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a user by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.zendesk.com/api-reference/ticketing/users/users/
            endpoint: `/api/v2/users/${encodeURIComponent(input.userId)}.json`,
            retries: 3
        });

        if (!response.data || !response.data.user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with ID ${input.userId} not found`
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data.user);

        return {
            id: providerUser.id,
            ...(providerUser.url !== undefined && { url: providerUser.url }),
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.created_at !== undefined && { createdAt: providerUser.created_at }),
            ...(providerUser.updated_at !== undefined && { updatedAt: providerUser.updated_at }),
            ...(providerUser.time_zone !== undefined && { timeZone: providerUser.time_zone }),
            ...(providerUser.iana_time_zone !== undefined && { ianaTimeZone: providerUser.iana_time_zone }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.locale !== undefined && { locale: providerUser.locale }),
            ...(providerUser.locale_id !== undefined && { localeId: providerUser.locale_id }),
            ...(providerUser.organization_id != null && { organizationId: providerUser.organization_id }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.verified !== undefined && { verified: providerUser.verified }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.suspended !== undefined && { suspended: providerUser.suspended })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
